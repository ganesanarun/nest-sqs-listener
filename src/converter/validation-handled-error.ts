/**
 * Special error thrown by converters to signal that validation failed
 * but was already handled (logged and acknowledged/rejected).
 * 
 * The container should catch this error and skip listener invocation
 * without invoking the error handler or modifying acknowledgement state.
 * 
 * This is used internally for ACKNOWLEDGE and REJECT validation failure modes.
 */
export class ValidationHandledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationHandledError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationHandledError);
    }
  }
}
