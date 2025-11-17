import {ValidationFailureMode} from '../types/validation-failure-mode.enum';

/**
 * Options passed to class-validator's validate function.
 * This is a subset of ValidatorOptions from class-validator.
 */
export interface ValidatorOptions {
    /**
     * If set to true, the validator will skip validation of properties that are not in the object.
     */
    skipMissingProperties?: boolean;

    /**
     * If set to true, validator will strip a validated object of any properties that do not have any decorators.
     */
    whitelist?: boolean;

    /**
     * If set to true, instead of stripping non-whitelisted properties validator will throw an error.
     */
    forbidNonWhitelisted?: boolean;

    /**
     * Groups to be used during validation of the object.
     */
    groups?: string[];

    /**
     * If set to true, the validation will not use default messages.
     */
    dismissDefaultMessages?: boolean;

    /**
     * Settings for the ValidationError object.
     */
    validationError?: {
        /**
         * Indicates if target should be exposed in ValidationError.
         */
        target?: boolean;

        /**
         * Indicates if validated value should be exposed in ValidationError.
         */
        value?: boolean;
    };

    /**
     * If set to true, validation of the given property will stop after encountering the first error.
     */
    stopAtFirstError?: boolean;
}

/**
 * Configuration options for JsonPayloadMessagingConverter validation behavior.
 *
 * @example
 * ```typescript
 * // Basic validation enabled
 * const options: JsonPayloadConverterOptions = {
 *   enableValidation: true
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Validation with whitelist mode (strip extra properties)
 * const options: JsonPayloadConverterOptions = {
 *   enableValidation: true,
 *   validatorOptions: {
 *     whitelist: true,
 *     forbidNonWhitelisted: true
 *   },
 *   validationFailureMode: ValidationFailureMode.THROW
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Validation with ACKNOWLEDGE mode (discard invalid messages)
 * const options: JsonPayloadConverterOptions = {
 *   enableValidation: true,
 *   validationFailureMode: ValidationFailureMode.ACKNOWLEDGE,
 *   validatorOptions: {
 *     stopAtFirstError: true
 *   }
 * };
 * ```
 */
export interface JsonPayloadConverterOptions {
    /**
     * Enable automatic validation using class-validator.
     * When enabled, the converter will validate the transformed payload
     * against class-validator decorators on the target class.
     *
     * @default false (opt-in)
     */
    enableValidation?: boolean;

    /**
     * Options passed to class-validator's validate function.
     * These options control validation behavior such as whitelist mode,
     * skipping missing properties, and validation groups.
     */
    validatorOptions?: ValidatorOptions;

    /**
     * Behavior when validation fails.
     * - THROW: Throw error and invoke error handler (default)
     * - ACKNOWLEDGE: Log error and remove message from queue
     * - REJECT: Log error and allow message to retry
     *
     * @default ValidationFailureMode.THROW
     */
    validationFailureMode?: ValidationFailureMode;
}
