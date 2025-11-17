import {Type} from '../types';
import {LoggerInterface} from '../logger/logger.interface';
import {JsonPayloadConverterOptions} from './json-payload-converter-options.interface';
import {MessageContext} from '../listener/message-context.interface';
import {MessageValidationError, ValidationError} from './message-validation-error';
import {ValidationFailureMode} from '../types/validation-failure-mode.enum';
import {ValidationHandledError} from './validation-handled-error';

/**
 * Base class providing shared validation logic for converters.
 * Both JsonPayloadMessagingConverter and ValidatingPayloadConverter
 * extend this class to reuse validation functionality.
 */
export abstract class BaseValidatingConverter<T> {
    protected readonly enableValidation: boolean;
    protected readonly validationFailureMode: ValidationFailureMode;
    protected readonly validatorOptions?: any;
    protected classValidatorAvailable: boolean | null = null;
    protected validateFunction?: (object: any, options?: any) => Promise<ValidationError[]>;

    /**
     * Creates a new base validating converter.
     *
     * @param targetClass The class constructor to validate against
     * @param options Optional validation configuration options
     * @param logger Optional logger for logging validation failures
     */
    protected constructor(
        protected readonly targetClass: Type<T> | undefined,
        protected readonly options: JsonPayloadConverterOptions | undefined,
        protected readonly logger: LoggerInterface | undefined
    ) {
        this.enableValidation = options?.enableValidation ?? false;
        this.validationFailureMode = options?.validationFailureMode ?? ValidationFailureMode.THROW;
        this.validatorOptions = options?.validatorOptions;
    }

    /**
     * Validates a payload instance using class-validator.
     * Gracefully handles cases where a class-validator is not installed.
     *
     * @param instance The instance to validate
     * @returns Array of validation errors (empty if valid or validation unavailable)
     * @protected
     */
    protected async validatePayload(instance: T): Promise<ValidationError[]> {
        // Check if class-validator is available (lazy check)
        if (this.classValidatorAvailable === null) {
            try {
                // Dynamic import to avoid hard dependency
                // @ts-ignore - class-validator is an optional peer dependency
                const classValidator = await import('class-validator');
                this.validateFunction = classValidator.validate;
                this.classValidatorAvailable = true;
            } catch (error) {
                // class-validator not installed - log warning once and skip validation
                if (this.logger) {
                    this.logger.warn(
                        'class-validator is not installed. Validation is disabled. ' +
                        'Install class-validator to enable validation: npm install class-validator'
                    );
                }
                this.classValidatorAvailable = false;
                return [];
            }
        }

        // If class-validator is not available, skip validation
        if (!this.classValidatorAvailable || !this.validateFunction) {
            return [];
        }

        // Perform validation
        try {
            const errors = await this.validateFunction(instance, this.validatorOptions);
            return errors as ValidationError[];
        } catch (error) {
            // If validation itself fails, log and skip
            if (this.logger) {
                this.logger.warn(`Validation failed with error: ${error instanceof Error ? error.message : String(error)}`);
            }
            return [];
        }
    }

    /**
     * Handles validation failure based on the configured mode.
     *
     * @param errors Array of validation errors from class-validator
     * @param body Original message body for error context
     * @param context Optional message context for acknowledgement
     * @throws MessageValidationError if mode is THROW
     * @protected
     */
    protected async handleValidationFailure(
        errors: ValidationError[],
        body: string,
        context?: MessageContext
    ): Promise<void> {
        const targetClassName = this.targetClass?.name || 'Unknown';
        const errorMessage = `Message validation failed for class '${targetClassName}'`;
        const validationError = new MessageValidationError(
            errorMessage,
            errors,
            body,
            targetClassName
        );

        const formattedErrors = validationError.getFormattedErrors();

        switch (this.validationFailureMode) {
            case ValidationFailureMode.THROW:
                // Throw error to invoke error handler
                // Don't log here - the error handler will log with full context
                throw validationError;

            case ValidationFailureMode.ACKNOWLEDGE:
                // Log error and acknowledge message
                if (this.logger) {
                    this.logger.error(
                        `${errorMessage}. Acknowledging message to remove from queue.\n${formattedErrors}`,
                        validationError.stack
                    );
                }
                
                if (context) {
                    try {
                        await context.acknowledge();
                        // Throw special error to signal container that validation was handled
                        // Container should skip listener invocation but not invoke error handler
                        throw new ValidationHandledError(
                            `Validation failed and message was acknowledged: ${errorMessage}`
                        );
                    } catch (ackError) {
                        // If it's already a ValidationHandledError, re-throw it
                        if (ackError instanceof ValidationHandledError) {
                            throw ackError;
                        }
                        
                        if (this.logger) {
                            this.logger.error(
                                `Failed to acknowledge message after validation failure: ${ackError instanceof Error ? ackError.message : String(ackError)}`
                            );
                        }
                        // Fall back to throwing original validation error if acknowledgement fails
                        throw validationError;
                    }
                } else {
                    // No context available - fall back to THROW mode
                    if (this.logger) {
                        this.logger.warn('No message context available for ACKNOWLEDGE mode, falling back to THROW');
                    }
                    throw validationError;
                }

            case ValidationFailureMode.REJECT:
                // Log error without acknowledgement (message will retry)
                if (this.logger) {
                    this.logger.error(
                        `${errorMessage}. Message will retry.\n${formattedErrors}`,
                        validationError.stack
                    );
                }
                // Throw special error to signal container that validation was handled
                // Container should skip listener invocation but not invoke error handler
                // Message will not be acknowledged and will retry
                throw new ValidationHandledError(
                    `Validation failed and message was rejected: ${errorMessage}`
                );

            default:
                // Unknown mode - fall back to THROW
                throw validationError;
        }
    }
}
