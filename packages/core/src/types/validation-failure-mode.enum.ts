/**
 * Validation failure mode determining how the system handles messages that fail validation.
 *
 * @example
 * ```typescript
 * // THROW mode (default): Throw error and invoke error handler
 * const converter = new JsonPayloadMessagingConverter(
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validationFailureMode: ValidationFailureMode.THROW
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // ACKNOWLEDGE mode: Log error and remove message from queue
 * const converter = new JsonPayloadMessagingConverter(
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
 *   },
 *   logger
 * );
 * ```
 *
 * @example
 * ```typescript
 * // REJECT mode: Log error and allow message to retry
 * const converter = new JsonPayloadMessagingConverter(
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validationFailureMode: ValidationFailureMode.REJECT
 *   },
 *   logger
 * );
 * ```
 *
 * @enum {string}
 */
export enum ValidationFailureMode {
    /**
     * Throw error and invoke error handler.
     * Message will not be acknowledged and will retry based on queue configuration.
     * This is the default behavior.
     */
    THROW = 'THROW',

    /**
     * Log validation error and acknowledge the message.
     * Message will be removed from queue (no retry).
     * Use when invalid messages should be discarded.
     */
    ACKNOWLEDGE = 'ACKNOWLEDGE',

    /**
     * Log validation error but don't acknowledge.
     * Message will retry and eventually move to DLQ based on queue configuration.
     * Similar to THROW but doesn't invoke error handler.
     */
    REJECT = 'REJECT',
}
