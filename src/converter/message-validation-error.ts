/**
 * Represents a validation error from class-validator.
 * This is a minimal interface to avoid hard dependency on class-validator.
 */
export interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

/**
 * Error thrown when message payload validation fails.
 * Contains structured information about all validation failures.
 *
 * @example
 * ```typescript
 * // Catching and handling validation errors
 * try {
 *   const payload = await converter.convert(messageBody);
 * } catch (error) {
 *   if (error instanceof MessageValidationError) {
 *     console.error('Validation failed for:', error.targetClass);
 *     console.error('Errors:', error.getFormattedErrors());
 *     console.error('Original body:', error.originalBody);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Accessing validation constraints programmatically
 * const errorHandler: QueueListenerErrorHandler = {
 *   onError: async (error, message, context) => {
 *     if (error instanceof MessageValidationError) {
 *       const constraints = error.getConstraints();
 *       constraints.forEach(({ property, constraints }) => {
 *         console.log(`Property ${property} failed:`, constraints);
 *       });
 *     }
 *   }
 * };
 * ```
 */
export class MessageValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: ValidationError[],
    public readonly originalBody: string,
    public readonly targetClass: string
  ) {
    super(message);
    this.name = 'MessageValidationError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessageValidationError);
    }
  }

  /**
   * Extract all validation constraint failures as a flat array.
   * Each entry contains the property path and array of constraint messages.
   * Handles nested validation errors recursively.
   * 
   * @returns Array of objects with property and constraints
   */
  getConstraints(): Array<{ property: string; constraints: string[] }> {
    const extractConstraints = (
      error: ValidationError, 
      prefix = ''
    ): Array<{ property: string; constraints: string[] }> => {
      const results: Array<{ property: string; constraints: string[] }> = [];
      const propertyPath = prefix ? `${prefix}.${error.property}` : error.property;
      
      // Check if this error has children (nested validation)
      const hasChildren = error.children && error.children.length > 0;
      
      // Add constraints for this property if any exist, or if it has no children
      // (properties without constraints but without children should still be included)
      if (error.constraints && Object.keys(error.constraints).length > 0) {
        results.push({
          property: propertyPath,
          constraints: Object.values(error.constraints)
        });
      } else if (!hasChildren) {
        // Include properties with no constraints only if they have no children
        // This handles edge cases while avoiding duplicate entries for parent properties
        results.push({
          property: propertyPath,
          constraints: []
        });
      }
      
      // Recursively extract nested errors (for nested objects/arrays)
      if (hasChildren) {
        error.children!.forEach(child => {
          results.push(...extractConstraints(child, propertyPath));
        });
      }
      
      return results;
    };
    
    return this.validationErrors.flatMap(error => extractConstraints(error));
  }

  /**
   * Get human-readable formatted error messages.
   * Returns a multi-line string with each validation failure on a separate line.
   * Handles nested validation errors recursively.
   * 
   * @returns Formatted error message string
   */
  getFormattedErrors(): string {
    const formatError = (error: ValidationError, prefix = ''): string[] => {
      const results: string[] = [];
      const propertyPath = prefix ? `${prefix}.${error.property}` : error.property;
      
      // Check if this error has children (nested validation)
      const hasChildren = error.children && error.children.length > 0;
      
      // Add constraints for this property if any exist, or if it has no children
      if (error.constraints && Object.keys(error.constraints).length > 0) {
        const constraints = Object.values(error.constraints).join(', ');
        results.push(`  - ${propertyPath}: ${constraints}`);
      } else if (!hasChildren) {
        // Include properties with no constraints only if they have no children
        // This handles edge cases while avoiding duplicate entries for parent properties
        results.push(`  - ${propertyPath}: `);
      }
      
      // Recursively format nested errors (for nested objects/arrays)
      if (hasChildren) {
        error.children!.forEach(child => {
          results.push(...formatError(child, propertyPath));
        });
      }
      
      return results;
    };
    
    return this.validationErrors
      .flatMap(error => formatError(error))
      .join('\n');
  }
}
