// ============================================================================
// Re-export all core package types and classes for convenience
// ============================================================================
export * from '@snow-tzu/sqs-listener';

// ============================================================================
// NestJS Adapter Exports
// ============================================================================
export { NestJSSqsMessageListenerContainer } from './container/nestjs-sqs-message-listener-container';
export { NestJSLoggerAdapter } from './logger/nestjs-logger-adapter';

// ============================================================================
// Backward Compatibility Alias
// ============================================================================
// Provides 100% API compatibility with version 0.0.4
// Existing NestJS users can upgrade without any code changes
export { NestJSSqsMessageListenerContainer as SqsMessageListenerContainer } from './container/nestjs-sqs-message-listener-container';
