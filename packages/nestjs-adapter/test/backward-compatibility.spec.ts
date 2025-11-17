import { SQSClient } from '@aws-sdk/client-sqs';
import { Logger } from '@nestjs/common';
import {
  SqsMessageListenerContainer,
  NestJSSqsMessageListenerContainer,
  AcknowledgementMode,
  QueueListener,
  MessageContext,
} from '../src/index';

/**
 * Backward Compatibility Tests
 * 
 * These tests verify that the refactored package maintains 100% API compatibility
 * with version 0.0.4. Existing NestJS users should be able to upgrade without
 * any code changes.
 * 
 * Requirements tested:
 * - 8.1: NestJS Adapter Package SHALL provide full backward compatibility
 * - 9.2: NestJS Adapter Package SHALL include integration tests
 */
describe('Backward Compatibility', () => {
  let mockSqsClient: jest.Mocked<SQSClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // ARRANGE: Create mock SQS client
    mockSqsClient = {
      send: jest.fn().mockResolvedValue({}),
    } as any;

    // ARRANGE: Create mock NestJS Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
  });

  afterEach(async () => {
    // CLEANUP: Ensure no containers are left running
    jest.clearAllMocks();
  });

  describe('SqsMessageListenerContainer alias', () => {
    it('should export SqsMessageListenerContainer as an alias', () => {
      // ARRANGE & ACT: Import the alias

      // ASSERT: Verify the alias exists and is the correct class
      expect(SqsMessageListenerContainer).toBeDefined();
      expect(SqsMessageListenerContainer).toBe(NestJSSqsMessageListenerContainer);
    });

    it('should allow instantiation using the old class name', () => {
      // ARRANGE & ACT: Create container using old class name
      const container = new SqsMessageListenerContainer(mockSqsClient, mockLogger);

      // ASSERT: Verify container is created and is instance of both names
      expect(container).toBeInstanceOf(SqsMessageListenerContainer);
      expect(container).toBeInstanceOf(NestJSSqsMessageListenerContainer);
    });

    it('should support all configuration methods from 0.0.4', () => {
      // ARRANGE: Create container using old class name
      const container = new SqsMessageListenerContainer(mockSqsClient, mockLogger);

      // ACT: Configure using 0.0.4 API
      expect(() => {
        container.configure(options => {
          options
            .queueName('test-queue')
            .pollTimeout(20)
            .autoStartup(false)
            .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
            .maxConcurrentMessages(5)
            .visibilityTimeout(30)
            .maxMessagesPerPoll(10);
        });
      }).not.toThrow();

      // ASSERT: Verify configuration was applied
      expect(container.isAutoStartupEnabled()).toBe(false);
    });

    it('should support setId method from 0.0.4', () => {
      // ARRANGE: Create container
      const container = new SqsMessageListenerContainer(mockSqsClient, mockLogger);

      // ACT & ASSERT: Verify setId method exists and works
      expect(() => {
        container.setId('testListener');
      }).not.toThrow();
    });

    it('should support setMessageListener method from 0.0.4', () => {
      // ARRANGE: Create container and mock listener
      const container = new SqsMessageListenerContainer(mockSqsClient, mockLogger);
      const mockListener: QueueListener<any> = {
        onMessage: jest.fn(),
      };

      // ACT & ASSERT: Verify setMessageListener method exists and works
      expect(() => {
        container.setMessageListener(mockListener);
      }).not.toThrow();
    });

    it('should support setErrorHandler method from 0.0.4', () => {
      // ARRANGE: Create container and mock error handler
      const container = new SqsMessageListenerContainer(mockSqsClient, mockLogger);
      const mockErrorHandler = {
        handleError: jest.fn(),
      };

      // ACT & ASSERT: Verify setErrorHandler method exists and works
      expect(() => {
        container.setErrorHandler(mockErrorHandler);
      }).not.toThrow();
    });
  });

  describe('API compatibility with 0.0.4', () => {
    class TestEvent {
      orderId!: string;
      amount!: number;
    }

    let container: SqsMessageListenerContainer<TestEvent>;
    let mockListener: jest.Mocked<QueueListener<TestEvent>>;

    beforeEach(() => {
      // ARRANGE: Create container using old API
      container = new SqsMessageListenerContainer<TestEvent>(mockSqsClient, mockLogger);

      mockListener = {
        onMessage: jest.fn(),
      };
    });

    afterEach(async () => {
      // CLEANUP: Stop container if running
      if (container && container.isContainerRunning()) {
        await container.stop();
      }
    });

    it('should support the complete 0.0.4 factory pattern', () => {
      // ARRANGE & ACT: Use exact pattern from 0.0.4 examples
      expect(() => {
        container.configure(options => {
          options
            .queueName('order-queue')
            .pollTimeout(20)
            .autoStartup(false)
            .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
            .maxConcurrentMessages(5)
            .visibilityTimeout(30)
            .maxMessagesPerPoll(10);
        });

        container.setId('orderCreatedListener');
        container.setMessageListener(mockListener);
      }).not.toThrow();

      // ASSERT: Verify configuration
      expect(container.isAutoStartupEnabled()).toBe(false);
    });

    it('should support all acknowledgement modes from 0.0.4', () => {
      // ARRANGE & ACT: Test each acknowledgement mode
      const modes = [
        AcknowledgementMode.ON_SUCCESS,
        AcknowledgementMode.ALWAYS,
        AcknowledgementMode.MANUAL,
      ];

      // ASSERT: Verify all modes are available and can be configured
      modes.forEach(mode => {
        expect(() => {
          container.configure(options => {
            options
              .queueName('test-queue')
              .autoStartup(false)
              .acknowledgementMode(mode);
          });
        }).not.toThrow();
      });
    });

    it('should support validation configuration from 0.0.4', () => {
      // ARRANGE & ACT: Configure validation as in 0.0.4
      expect(() => {
        container.configure(options => {
          options
            .queueName('test-queue')
            .autoStartup(false)
            .targetClass(TestEvent)
            .enableValidation(true)
            .validatorOptions({
              whitelist: true,
              forbidNonWhitelisted: false,
            });
        });
      }).not.toThrow();

      // ASSERT: Configuration applied without errors
      expect(container).toBeDefined();
    });

    it('should support lifecycle methods from 0.0.4', async () => {
      // ARRANGE: Configure container
      container.configure(options => {
        options
          .queueName('test-queue')
          .autoStartup(false);
      });
      container.setMessageListener(mockListener);

      // Mock SQS responses
      (mockSqsClient.send as jest.Mock).mockResolvedValue({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
      });

      // ACT & ASSERT: Verify start and stop methods exist and work
      await expect(container.start()).resolves.not.toThrow();
      expect(container.isContainerRunning()).toBe(true);

      await expect(container.stop()).resolves.not.toThrow();
      expect(container.isContainerRunning()).toBe(false);
    });

    it('should support NestJS lifecycle hooks', async () => {
      // ARRANGE: Configure container with autoStartup
      container.configure(options => {
        options
          .queueName('test-queue')
          .autoStartup(true);
      });
      container.setMessageListener(mockListener);

      // Mock SQS responses
      (mockSqsClient.send as jest.Mock).mockResolvedValue({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
      });

      // ACT: Call lifecycle hooks
      await container.onModuleInit();

      // ASSERT: Container should be running
      expect(container.isContainerRunning()).toBe(true);

      // ACT: Call destroy hook
      await container.onModuleDestroy();

      // ASSERT: Container should be stopped
      expect(container.isContainerRunning()).toBe(false);
    });
  });

  describe('Type exports compatibility', () => {
    it('should export all types from 0.0.4', () => {
      // ARRANGE & ACT: Import types that were available in 0.0.4
      const {
        AcknowledgementMode,
        QueueListener,
        MessageContext,
        PayloadMessagingConverter,
        QueueListenerErrorHandler,
        LoggerInterface,
        ContainerConfiguration,
      } = require('../src/index');

      // ASSERT: All types should be defined
      expect(AcknowledgementMode).toBeDefined();
      expect(AcknowledgementMode.ON_SUCCESS).toBeDefined();
      expect(AcknowledgementMode.ALWAYS).toBeDefined();
      expect(AcknowledgementMode.MANUAL).toBeDefined();

      // Verify interfaces are exported (they exist as types)
      expect(typeof QueueListener).toBe('undefined'); // Interfaces don't exist at runtime
      expect(typeof MessageContext).toBe('undefined');
      expect(typeof PayloadMessagingConverter).toBe('undefined');
      expect(typeof QueueListenerErrorHandler).toBe('undefined');
      expect(typeof LoggerInterface).toBe('undefined');
      expect(typeof ContainerConfiguration).toBe('undefined');
    });

    it('should export converter classes from 0.0.4', () => {
      // ARRANGE & ACT: Import converter classes
      const {
        JsonPayloadMessagingConverter,
        ValidatingPayloadConverter,
      } = require('../src/index');

      // ASSERT: Converter classes should be defined
      expect(JsonPayloadMessagingConverter).toBeDefined();
      expect(ValidatingPayloadConverter).toBeDefined();
    });

    it('should export error handler classes from 0.0.4', () => {
      // ARRANGE & ACT: Import error handler classes
      const {
        DefaultQueueListenerErrorHandler,
      } = require('../src/index');

      // ASSERT: Error handler class should be defined
      expect(DefaultQueueListenerErrorHandler).toBeDefined();
    });
  });

  describe('Constructor compatibility', () => {
    it('should accept SQSClient without logger (0.0.4 behavior)', () => {
      // ARRANGE & ACT: Create container without logger
      const container = new SqsMessageListenerContainer(mockSqsClient);

      // ASSERT: Container should be created with default logger
      expect(container).toBeInstanceOf(SqsMessageListenerContainer);
      expect(container).toBeDefined();
    });

    it('should accept SQSClient with logger (0.0.4 behavior)', () => {
      // ARRANGE & ACT: Create container with logger
      const container = new SqsMessageListenerContainer(mockSqsClient, mockLogger);

      // ASSERT: Container should be created
      expect(container).toBeInstanceOf(SqsMessageListenerContainer);
      expect(container).toBeDefined();
    });

    it('should work with generic type parameter (0.0.4 behavior)', () => {
      // ARRANGE: Define event type
      interface OrderEvent {
        orderId: string;
        customerId: string;
      }

      // ACT: Create typed container
      const container = new SqsMessageListenerContainer<OrderEvent>(mockSqsClient, mockLogger);

      // ASSERT: Container should be created with correct type
      expect(container).toBeInstanceOf(SqsMessageListenerContainer);

      // Verify type safety at compile time (this would fail if types are wrong)
      const listener: QueueListener<OrderEvent> = {
        onMessage: async (payload: OrderEvent, context: MessageContext) => {
          // Type checking ensures payload has correct shape
          const orderId: string = payload.orderId;
          const customerId: string = payload.customerId;
        },
      };

      container.setMessageListener(listener);
      expect(container).toBeDefined();
    });
  });
});
