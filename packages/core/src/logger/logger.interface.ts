/**
 * Framework-agnostic logger interface.
 * Implementations provide logging functionality for their specific framework or environment.
 * 
 * This interface enables the core package to remain framework-independent while
 * allowing different frameworks to provide their own logging implementations.
 */
export interface LoggerInterface {
  /**
   * Log an informational message.
   * 
   * @param message - The message to log
   * @param context - Optional context identifier (e.g., class name, module name)
   */
  log(message: string, context?: string): void;

  /**
   * Log an error message.
   * 
   * @param message - The error message to log
   * @param trace - Optional stack trace or additional error details
   * @param context - Optional context identifier (e.g., class name, module name)
   */
  error(message: string, trace?: string, context?: string): void;

  /**
   * Log a warning message.
   * 
   * @param message - The warning message to log
   * @param context - Optional context identifier (e.g., class name, module name)
   */
  warn(message: string, context?: string): void;

  /**
   * Log a debug message.
   * 
   * @param message - The debug message to log
   * @param context - Optional context identifier (e.g., class name, module name)
   */
  debug(message: string, context?: string): void;
}
