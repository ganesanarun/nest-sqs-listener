import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';
import {FastifySqsContainer} from '../container';
import {FastifySqsListenerOptions} from '../types';


/**
 * Fastify plugin that integrates SQS message listening with Fastify's lifecycle.
 *
 * This plugin creates a FastifySqsContainer, configures it with the provided options,
 * registers a single listener, and integrates with Fastify's startup/shutdown lifecycle.
 * For multiple message types, register the plugin multiple times with different configurations.
 *
 * The plugin follows Fastify's encapsulation model and provides proper error handling
 * and cleanup during application shutdown.
 *
 * @example
 * ```typescript
 * import { sqsListenerPlugin } from '@snow-tzu/fastify-sqs-listener';
 *
 * // Register for order messages
 * await fastify.register(sqsListenerPlugin, {
 *   queueNameOrUrl: 'order-events',
 *   listener: {
 *     messageType: OrderMessage,
 *     listener: new OrderMessageListener()
 *   },
 *   sqsClient: new SQSClient({ region: 'us-east-1' }),
 *   containerId: 'order-processor'
 * });
 *
 * // Register for notification messages
 * await fastify.register(sqsListenerPlugin, {
 *   queueNameOrUrl: 'notification-events',
 *   listener: {
 *     messageType: NotificationMessage,
 *     listener: new NotificationMessageListener()
 *   },
 *   sqsClient: new SQSClient({ region: 'us-east-1' }),
 *   containerId: 'notification-processor'
 * });
 * ```
 */
const sqsListenerPluginImpl: FastifyPluginAsync<FastifySqsListenerOptions> = async (
    fastify: FastifyInstance,
    options: FastifySqsListenerOptions
) => {
    // Validate required options
    if (!options.queueNameOrUrl || typeof options.queueNameOrUrl !== 'string' || options.queueNameOrUrl.trim().length === 0) {
        throw new Error('Invalid plugin options: queueUrl is required and must be a non-empty string');
    }

    if (!options.listener) {
        throw new Error('Invalid plugin options: listener is required');
    }

    if (!options.sqsClient || typeof options.sqsClient !== 'object') {
        throw new Error('Invalid plugin options: sqsClient is required and must be an SQS client instance');
    }

    // Validate single listener configuration
    if (!options.listener.messageType || typeof options.listener.messageType !== 'function') {
        throw new Error('Invalid plugin options: listener.messageType is required and must be a constructor function');
    }
    if (!options.listener.listener || typeof options.listener.listener.onMessage !== 'function') {
        throw new Error('Invalid plugin options: listener.listener is required and must implement QueueListener interface');
    }

    // Create the Fastify SQS container
    const container = new FastifySqsContainer(
        options.sqsClient,
        fastify,
        options.logger
    );

    // Configure the container with provided options
    container.configure(containerOptions => {
        // Set queue name/URL - the ContainerOptions API uses queueName for both names and URLs
        containerOptions.queueName(options.queueNameOrUrl);

        // Set the message type for automatic conversion
        containerOptions.targetClass(options.listener.messageType);

        // Set optional configuration
        if (options.autoStartup !== undefined) {
            containerOptions.autoStartup(options.autoStartup);
        }

        if (options.maxConcurrentMessages !== undefined) {
            containerOptions.maxConcurrentMessages(options.maxConcurrentMessages);
        }

        if (options.maxMessagesPerPoll !== undefined) {
            containerOptions.maxMessagesPerPoll(options.maxMessagesPerPoll);
        }

        if (options.pollTimeout !== undefined) {
            containerOptions.pollTimeout(options.pollTimeout);
        }

        if (options.visibilityTimeout !== undefined) {
            containerOptions.visibilityTimeout(options.visibilityTimeout);
        }

        if (options.acknowledgementMode !== undefined) {
            containerOptions.acknowledgementMode(options.acknowledgementMode);
        }

        if (options.pollingErrorBackoff !== undefined) {
            containerOptions.pollingErrorBackoff(options.pollingErrorBackoff);
        }

        // Add validation configuration
        if (options.enableValidation !== undefined) {
            containerOptions.enableValidation(options.enableValidation);
        }

        if (options.validationFailureMode !== undefined) {
            containerOptions.validationFailureMode(options.validationFailureMode);
        }

        if (options.validatorOptions !== undefined) {
            containerOptions.validatorOptions(options.validatorOptions);
        }
    });

    // Set container ID
    container.setId(options.containerId || 'fastify-sqs-listener');

    // Register the single listener
    container.setMessageListener(options.listener.listener);


    // Register lifecycle hooks for automatic startup/shutdown
    container.registerLifecycleHooks();

    // Decorate Fastify instance with container access
    // Use a registry approach to support multiple plugin registrations
    const containerId = options.containerId || 'default';

    if (!fastify.hasDecorator('sqsListenerRegistry')) {
        fastify.log.debug(`First SQS listener plugin registration for container ${containerId}`);
        // First registration: create registry
        const containerRegistry = new Map<string, any>();
        containerRegistry.set(containerId, container);
        fastify.decorate('sqsListenerRegistry', containerRegistry);

        // For backward compatibility, expose first container as 'sqsListener'
        fastify.decorate('sqsListener', container);
    } else {
        fastify.log.debug(`Subsequent SQS listener plugin registration for container ${containerId}`);
        // Subsequent registrations: add to existing registry only
        const registry = (fastify as any).sqsListenerRegistry;
        registry.set(containerId, container);
    }

    fastify.log.info(
        `SQS listener plugin registered for queue: ${options.queueNameOrUrl} with listener for ${options.listener.messageType.name}`
    );
};

/**
 * Fastify SQS Listener Plugin
 *
 * Wraps the plugin implementation with fastify-plugin to ensure proper encapsulation
 * and metadata handling.
 */
export const sqsListenerPlugin = fp(sqsListenerPluginImpl, {
    fastify: '4.x',
    name: '@snow-tzu/fastify-sqs-listener',
    dependencies: []
});