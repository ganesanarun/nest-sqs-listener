import {AcknowledgementMode} from '../types/acknowledgement-mode.enum';
import {ContainerConfiguration} from '../types/container-configuration';
import {PayloadMessagingConverter} from '../converter/payload-messaging-converter.interface';
import {ValidationFailureMode} from '../types/validation-failure-mode.enum';
import {ValidatorOptions} from '../converter/json-payload-converter-options.interface';
import {Type} from '../types';
import {LoggerInterface} from '../logger/logger.interface';
import {JsonPayloadMessagingConverter} from '../converter/json-payload-messaging-converter';
import {ValidatingPayloadConverter} from '../converter/validating-payload-converter';

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
 *     .queueName('my-queue')
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
    private _targetClass?: Type<any>;
    private _enableValidation?: boolean;
    private _validationFailureMode?: ValidationFailureMode;
    private _validatorOptions?: ValidatorOptions;

    /**
     * Sets the queue name or full queue URL.
     *
     * @param name Queue name (will be resolved to URL) or full queue URL
     * @returns This ContainerOptions instance for chaining
     */
    queueName(name: string): this {
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
     * - ALWAYS: Always delete it regardless of processing outcome
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
     * Sets the target class for automatic message transformation and validation.
     *
     * When set without a custom messageConverter, a JsonPayloadMessagingConverter
     * will be automatically created with the configured validation options.
     *
     * @param type The class constructor to transform messages into
     * @returns This ContainerOptions instance for chaining
     */
    targetClass<T>(type: Type<T>): this {
        this._targetClass = type;
        return this;
    }

    /**
     * Enables or disables automatic validation using class-validator.
     *
     * When enabled, messages will be validated against class-validator decorators
     * on the target class. Requires targetClass to be set.
     *
     * @param enabled Whether to enable validation
     * @returns This ContainerOptions instance for chaining
     */
    enableValidation(enabled: boolean): this {
        this._enableValidation = enabled;
        return this;
    }

    /**
     * Sets the behavior when validation fails.
     *
     * - THROW: Throw error and invoke error handler (default)
     * - ACKNOWLEDGE: Log error and remove a message from queue
     * - REJECT: Log error and allow a message to retry
     *
     * @param mode Validation failure mode
     * @returns This ContainerOptions instance for chaining
     */
    validationFailureMode(mode: ValidationFailureMode): this {
        this._validationFailureMode = mode;
        return this;
    }

    /**
     * Sets options passed to class-validator's validate function.
     *
     * These options control validation behavior such as whitelist mode,
     * skipping missing properties, and validation groups.
     *
     * @param options Validator options
     * @returns This ContainerOptions instance for chaining
     */
    validatorOptions(options: ValidatorOptions): this {
        this._validatorOptions = options;
        return this;
    }

    /**
     * Builds and returns the complete container configuration.
     *
     * Automatically creates converters based on configuration:
     * - If targetClass provided without messageConverter, creates JsonPayloadMessagingConverter
     * - If messageConverter provided with validation options and targetClass, wraps with ValidatingPayloadConverter
     *
     * @param logger Optional logger instance from the container (to avoid duplicate loggers)
     * @returns Complete ContainerConfiguration object with all settings
     */
    build(logger?: LoggerInterface): ContainerConfiguration & { messageConverter?: PayloadMessagingConverter<any>, maxPollCycles?: number } {
        let messageConverter = this._messageConverter;
        const converterLogger = logger;

        // Case 1: targetClass provided without custom converter
        // Create JsonPayloadMessagingConverter with validation options
        if (this._targetClass && !this._messageConverter) {
            messageConverter = new JsonPayloadMessagingConverter(
                this._targetClass,
                {
                    enableValidation: this._enableValidation,
                    validationFailureMode: this._validationFailureMode,
                    validatorOptions: this._validatorOptions,
                },
                converterLogger
            );
        }
        // Case 2: custom converter + validation options + targetClass
        // Wrap converter with ValidatingPayloadConverter
        else if (this._messageConverter && this._enableValidation && this._targetClass) {
            messageConverter = new ValidatingPayloadConverter(
                this._messageConverter,
                this._targetClass,
                {
                    enableValidation: this._enableValidation,
                    validationFailureMode: this._validationFailureMode,
                    validatorOptions: this._validatorOptions,
                },
                converterLogger
            );
        }

        return {
            id: '',
            queueName: this._queueName,
            pollTimeout: this._pollTimeout,
            visibilityTimeout: this._visibilityTimeout,
            maxConcurrentMessages: this._maxConcurrentMessages,
            maxMessagesPerPoll: this._maxMessagesPerPoll,
            autoStartup: this._autoStartup,
            acknowledgementMode: this._acknowledgementMode,
            messageConverter: messageConverter,
            maxPollCycles: this._maxPollCycles,
        };
    }
}
