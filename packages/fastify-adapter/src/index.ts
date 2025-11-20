// ============================================================================
// Main Plugin Export
// ============================================================================
export {sqsListenerPlugin} from './plugin';

// ============================================================================
// Fastify-Specific Components
// ============================================================================
export {FastifyLoggerAdapter} from './logger';
export {FastifySqsContainer} from './container';

// ============================================================================
// TypeScript Types and Interfaces
// ============================================================================
export {
    FastifySqsListenerOptions,
    FastifyListenerConfig
} from './types';

// ============================================================================
// Re-exported Core Package Types for Convenience
// ============================================================================
export {
    // Core interfaces
    QueueListener,
    LoggerInterface,
    MessageContext,

    // Core container and configuration
    SqsMessageListenerContainer,
    ContainerOptions,

    // Message conversion and validation
    PayloadMessagingConverter,
    JsonPayloadMessagingConverter,
    ValidatingPayloadConverter,
    MessageValidationError,
    ValidationHandledError,

    // Error handling
    QueueListenerErrorHandler,
    DefaultQueueListenerErrorHandler,

    // Types and enums
    Type,
    AcknowledgementMode,
    ValidationFailureMode,
    ValidatorOptions,
    ContainerConfiguration
} from '@snow-tzu/sqs-listener';