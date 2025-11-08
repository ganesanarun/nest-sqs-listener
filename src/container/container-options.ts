import {AcknowledgementMode} from '../types/acknowledgement-mode.enum';
import {ContainerConfiguration} from '../types/container-configuration';
import {PayloadMessagingConverter} from '../converter/payload-messaging-converter.interface';

/**
 * Fluent configuration builder for SqsMessageListenerContainer.
 *
 * Provides a chainable API for configuring all container options including
 * queue settings, polling behavior, concurrency limits, and message handling.
 *
 * @example
 * ```typescript
 * container.configure(options => {
 *   options
 *     .queueNames('my-queue')
 *     .pollTimeout(20)
 *     .maxConcurrentMessages(10)
 *     .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
 * });
 * ```
 */
export class ContainerOptions {
    private _queueName: string = '';
    private _pollTimeout: number = 20;
    private _visibilityTimeout: number = 30;
    private _maxConcurrentMessages: number = 10;
    private _maxMessagesPerPoll: number = 10;
    private _autoStartup: boolean = true;
    private _acknowledgementMode: AcknowledgementMode = AcknowledgementMode.ON_SUCCESS;
    private _messageConverter?: PayloadMessagingConverter<any>;
    private _maxPollCycles?: number;

    /**
     * Sets the queue name or full queue URL.
     *
     * @param name Queue name (will be resolved to URL) or full queue URL
     * @returns This ContainerOptions instance for chaining
     */
    queueNames(name: string): this {
        this._queueName = name;
        return this;
    }

    /**
     * Sets the long polling timeout in seconds.
     *
     * This is the maximum time to wait for messages when polling.
     * Default: 20 seconds
     *
     * @param seconds Poll timeout in seconds (0-20)
     * @returns This ContainerOptions instance for chaining
     */
    pollTimeout(seconds: number): this {
        this._pollTimeout = seconds;
        return this;
    }

    /**
     * Sets the visibility timeout in seconds.
     *
     * Duration that messages are hidden from other consumers after being received.
     * Default: 30 seconds
     *
     * @param seconds Visibility timeout in seconds
     * @returns This ContainerOptions instance for chaining
     */
    visibilityTimeout(seconds: number): this {
        this._visibilityTimeout = seconds;
        return this;
    }

    /**
     * Sets the maximum number of messages to process concurrently.
     *
     * Default: 10
     *
     * @param count Maximum concurrent messages
     * @returns This ContainerOptions instance for chaining
     */
    maxConcurrentMessages(count: number): this {
        this._maxConcurrentMessages = count;
        return this;
    }

    /**
     * Sets the maximum number of messages to receive per poll.
     *
     * AWS SQS maximum is 10.
     * Default: 10
     *
     * @param count Maximum messages per poll (1-10)
     * @returns This ContainerOptions instance for chaining
     */
    maxMessagesPerPoll(count: number): this {
        this._maxMessagesPerPoll = count;
        return this;
    }

    /**
     * Sets whether to start polling automatically when the module initializes.
     *
     * Default: true
     *
     * @param enabled Whether to auto-start
     * @returns This ContainerOptions instance for chaining
     */
    autoStartup(enabled: boolean): this {
        this._autoStartup = enabled;
        return this;
    }

    /**
     * Sets the acknowledgement mode determining when messages are deleted.
     *
     * - ON_SUCCESS: Delete only on successful processing (default)
     * - MANUAL: Never auto-delete, requires explicit acknowledge() call
     * - ALWAYS: Always delete regardless of processing outcome
     *
     * @param mode Acknowledgement mode
     * @returns This ContainerOptions instance for chaining
     */
    acknowledgementMode(mode: AcknowledgementMode): this {
        this._acknowledgementMode = mode;
        return this;
    }

    /**
     * Sets a custom message converter for transforming raw message bodies.
     *
     * If not set, a default JSON converter will be used.
     *
     * @param converter Custom payload messaging converter
     * @returns This ContainerOptions instance for chaining
     */
    messageConverter<T>(converter: PayloadMessagingConverter<T>): this {
        this._messageConverter = converter;
        return this;
    }

    /**
     * Sets the maximum number of polling cycles (for testing only).
     *
     * @param cycles Maximum poll cycles
     * @returns This ContainerOptions instance for chaining
     */
    maxPollCycles(cycles: number): this {
        this._maxPollCycles = cycles;
        return this;
    }

    /**
     * Builds and returns the complete container configuration.
     *
     * @returns Complete ContainerConfiguration object with all settings
     */
    build(): ContainerConfiguration & { messageConverter?: PayloadMessagingConverter<any>, maxPollCycles?: number } {
        return {
            id: '',
            queueName: this._queueName,
            pollTimeout: this._pollTimeout,
            visibilityTimeout: this._visibilityTimeout,
            maxConcurrentMessages: this._maxConcurrentMessages,
            maxMessagesPerPoll: this._maxMessagesPerPoll,
            autoStartup: this._autoStartup,
            acknowledgementMode: this._acknowledgementMode,
            messageConverter: this._messageConverter,
            maxPollCycles: this._maxPollCycles,
        };
    }
}
