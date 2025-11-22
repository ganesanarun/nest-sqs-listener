import Fastify, {FastifyInstance} from 'fastify';
import {SQSClient} from '@aws-sdk/client-sqs';
import {FastifySqsListenerOptions, sqsListenerPlugin} from '../../src';
import {AcknowledgementMode, MessageContext, QueueListener, ValidationFailureMode} from '@snow-tzu/sqs-listener';

class TestMessage {
    id: string;
    content: string;

    constructor(id: string, content: string) {
        this.id = id;
        this.content = content;
    }
}

class TestListener implements QueueListener<TestMessage> {
    public processedMessages: TestMessage[] = [];

    async onMessage(payload: TestMessage, context: MessageContext): Promise<void> {
        this.processedMessages.push(payload);
    }
}

describe('SQS Listener Plugin', () => {
    let fastify: FastifyInstance;
    let mockSqsClient: SQSClient;
    let testListener: TestListener;

    beforeEach(() => {
        fastify = Fastify({logger: false});
        mockSqsClient = new SQSClient({region: 'us-east-1'});
        testListener = new TestListener();
    });

    afterEach(async () => {
        if (fastify) {
            await fastify.close();
            // Give extra time for cleanup
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    });

    describe('Plugin Registration', () => {
        it('should register plugin with minimal valid options', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
            await fastify.ready();

            expect(fastify.hasDecorator('sqsListener')).toBe(true);
        });

        it('should register plugin with all configuration options', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false,
                maxConcurrentMessages: 5,
                maxMessagesPerPoll: 3,
                pollTimeout: 15,
                visibilityTimeout: 60,
                acknowledgementMode: AcknowledgementMode.MANUAL,
                pollingErrorBackoff: 10,
                containerId: 'custom-container-id'
            };

            await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
            await fastify.ready();

            expect(fastify.hasDecorator('sqsListener')).toBe(true);
        });

        it('should register plugin with single listener configuration', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
            await fastify.ready();

            expect(fastify.hasDecorator('sqsListener')).toBe(true);
        });

        it('should register plugin with validation configuration options', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                enableValidation: true,
                validationFailureMode: ValidationFailureMode.ACKNOWLEDGE,
                validatorOptions: {
                    whitelist: true,
                    forbidNonWhitelisted: true
                }
            };

            await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
            await fastify.ready();

            expect(fastify.hasDecorator('sqsListener')).toBe(true);
        });
    });

    describe('Plugin Validation', () => {
        it('should throw error when queueUrl is missing', async () => {
            const options = {
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            } as any;

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: queueUrl is required and must be a non-empty string'
            );
        });

        it('should throw error when queueUrl is empty string', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: '',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: queueUrl is required and must be a non-empty string'
            );
        });

        it('should throw error when queueUrl is whitespace only', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: '   ',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: queueUrl is required and must be a non-empty string'
            );
        });

        it('should throw error when listener is missing', async () => {
            const options = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                sqsClient: mockSqsClient
            } as FastifySqsListenerOptions;

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: listener is required'
            );
        });

        it('should throw error when listener is null', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: null as any,
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: listener is required'
            );
        });

        it('should throw error when sqsClient is missing', async () => {
            const options = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                }
            } as any;

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: sqsClient is required and must be an SQS client instance'
            );
        });

        it('should throw error when listener messageType is invalid', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: null as any,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: listener.messageType is required and must be a constructor function'
            );
        });

        it('should throw error when listener is invalid', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: {} as any
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: listener.listener is required and must implement QueueListener interface'
            );
        });

        it('should throw error when listener.messageType is undefined', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: undefined as any,
                    listener: testListener
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: listener.messageType is required and must be a constructor function'
            );
        });

        it('should throw error when listener.listener is null', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: null as any
                },
                sqsClient: mockSqsClient
            };

            await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                'Invalid plugin options: listener.listener is required and must implement QueueListener interface'
            );
        });

        describe('Batch Acknowledgement Validation', () => {
            it('should throw error when maxSize is less than 1', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true,
                    batchAcknowledgementOptions: {
                        maxSize: 0
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                    'Invalid plugin options: batchAcknowledgementOptions.maxSize must be between 1 and 10 (inclusive), got: 0'
                );
            });

            it('should throw error when maxSize is greater than 10', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true,
                    batchAcknowledgementOptions: {
                        maxSize: 11
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                    'Invalid plugin options: batchAcknowledgementOptions.maxSize must be between 1 and 10 (inclusive), got: 11'
                );
            });

            it('should throw error when maxSize is not an integer', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true,
                    batchAcknowledgementOptions: {
                        maxSize: 5.5
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                    'Invalid plugin options: batchAcknowledgementOptions.maxSize must be between 1 and 10 (inclusive), got: 5.5'
                );
            });

            it('should throw error when flushIntervalMs is negative', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true,
                    batchAcknowledgementOptions: {
                        flushIntervalMs: -1
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                    'Invalid plugin options: batchAcknowledgementOptions.flushIntervalMs must be non-negative, got: -1'
                );
            });

            it('should throw error when flushIntervalMs is not finite', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true,
                    batchAcknowledgementOptions: {
                        flushIntervalMs: Infinity
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).rejects.toThrow(
                    'Invalid plugin options: batchAcknowledgementOptions.flushIntervalMs must be non-negative, got: Infinity'
                );
            });

            it('should accept valid maxSize values (1-10)', async () => {
                for (const maxSize of [1, 5, 10]) {
                    const options: FastifySqsListenerOptions = {
                        queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                        listener: {
                            messageType: TestMessage,
                            listener: testListener
                        },
                        sqsClient: mockSqsClient,
                        enableBatchAcknowledgement: true,
                        batchAcknowledgementOptions: {
                            maxSize
                        }
                    };

                    await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                    await fastify.close();
                    fastify = Fastify({logger: false});
                }
            });

            it('should accept valid flushIntervalMs values (non-negative)', async () => {
                for (const flushIntervalMs of [0, 50, 100, 1000]) {
                    const options: FastifySqsListenerOptions = {
                        queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                        listener: {
                            messageType: TestMessage,
                            listener: testListener
                        },
                        sqsClient: mockSqsClient,
                        enableBatchAcknowledgement: true,
                        batchAcknowledgementOptions: {
                            flushIntervalMs
                        }
                    };

                    await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                    await fastify.close();
                    fastify = Fastify({logger: false});
                }
            });

            it('should accept both maxSize and flushIntervalMs together', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true,
                    batchAcknowledgementOptions: {
                        maxSize: 8,
                        flushIntervalMs: 50
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
            });

            it('should work without batchAcknowledgementOptions when enableBatchAcknowledgement is true', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableBatchAcknowledgement: true
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
            });
        });
    });

    describe('Plugin Encapsulation', () => {
        it('should isolate plugin context between registrations', async () => {
            const fastify1 = Fastify({logger: false});
            const fastify2 = Fastify({logger: false});

            const listener1 = new TestListener();
            const listener2 = new TestListener();

            const options1: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/queue-1',
                listener: {messageType: TestMessage, listener: listener1},
                sqsClient: mockSqsClient,
                containerId: 'container-1'
            };

            const options2: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/queue-2',
                listener: {messageType: TestMessage, listener: listener2},
                sqsClient: mockSqsClient,
                containerId: 'container-2'
            };

            await fastify1.register(sqsListenerPlugin, options1);
            await fastify2.register(sqsListenerPlugin, options2);

            await fastify1.ready();
            await fastify2.ready();

            expect(fastify1.hasDecorator('sqsListener')).toBe(true);
            expect(fastify2.hasDecorator('sqsListener')).toBe(true);

            expect((fastify1 as any).sqsListener).not.toBe((fastify2 as any).sqsListener);

            await fastify1.close();
            await fastify2.close();
        });

        it('should support nested plugin contexts', async () => {
            const parentFastify = Fastify({logger: false});

            await parentFastify.register(async (childFastify) => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/child-queue',
                    listener: {messageType: TestMessage, listener: testListener},
                    sqsClient: mockSqsClient
                };

                await childFastify.register(sqsListenerPlugin, options);

                expect(childFastify.hasDecorator('sqsListener')).toBe(true);
            });

            await parentFastify.ready();

            expect(parentFastify.hasDecorator('sqsListener')).toBe(false);

            await parentFastify.close();
        });
    });

    describe('TypeScript Type Safety', () => {
        it('should enforce correct option types at compile time', () => {
            const validOptions: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: true,
                maxConcurrentMessages: 10,
                acknowledgementMode: AcknowledgementMode.ON_SUCCESS
            };

            expect(validOptions.queueNameOrUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue');
            expect(validOptions.listener).toBeDefined();
            expect(validOptions.autoStartup).toBe(true);
        });

        it('should provide proper generic typing for listeners', () => {
            const typedListener: QueueListener<TestMessage> = testListener;

            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: typedListener
                },
                sqsClient: mockSqsClient
            };

            expect(options.listener.listener).toBe(typedListener);
        });
    });

    describe('Plugin Lifecycle Integration', () => {
        it('should register onClose hook for cleanup', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            expect(fastify.hasDecorator('sqsListener')).toBe(true);

            await expect(fastify.close()).resolves.not.toThrow();
        });

        it('should handle plugin registration with autoStartup disabled', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            expect(fastify.hasDecorator('sqsListener')).toBe(true);

            const container = (fastify as any).sqsListener;
            expect(container).toBeDefined();
        });
    });

    describe('Multiple Plugin Registrations', () => {
        class NotificationMessage {
            id: string;
            message: string;

            constructor(id: string, message: string) {
                this.id = id;
                this.message = message;
            }
        }

        class NotificationListener implements QueueListener<NotificationMessage> {
            public processedMessages: NotificationMessage[] = [];

            async onMessage(payload: NotificationMessage, context: MessageContext): Promise<void> {
                this.processedMessages.push(payload);
            }
        }

        it('should support multiple plugin registrations for different message types', async () => {
            const orderListener = new TestListener();
            const notificationListener = new NotificationListener();

            // Register plugins in separate encapsulated contexts to avoid decorator conflicts
            await fastify.register(async (childFastify1) => {
                await childFastify1.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/order-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: orderListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'order-container',
                    autoStartup: false
                });

                expect(childFastify1.hasDecorator('sqsListener')).toBe(true);
            });

            await fastify.register(async (childFastify2) => {
                await childFastify2.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/notification-queue',
                    listener: {
                        messageType: NotificationMessage,
                        listener: notificationListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'notification-container',
                    autoStartup: false
                });

                expect(childFastify2.hasDecorator('sqsListener')).toBe(true);
            });

            await fastify.ready();

            // Parent should not have the decorator due to encapsulation
            expect(fastify.hasDecorator('sqsListener')).toBe(false);
        });

        it('should create independent containers for each registration', async () => {
            const fastify1 = Fastify({logger: false});
            const fastify2 = Fastify({logger: false});

            const orderListener = new TestListener();
            const notificationListener = new NotificationListener();

            try {
                // Register different plugins on different Fastify instances
                await fastify1.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/order-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: orderListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'order-container',
                    autoStartup: false
                });

                await fastify2.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/notification-queue',
                    listener: {
                        messageType: NotificationMessage,
                        listener: notificationListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'notification-container',
                    autoStartup: false
                });

                await fastify1.ready();
                await fastify2.ready();

                const container1 = (fastify1 as any).sqsListener;
                const container2 = (fastify2 as any).sqsListener;

                expect(container1).toBeDefined();
                expect(container2).toBeDefined();
                expect(container1).not.toBe(container2);

                // Verify containers are independent
                expect(container1.isContainerRunning()).toBe(false);
                expect(container2.isContainerRunning()).toBe(false);

                await container1.start();
                expect(container1.isContainerRunning()).toBe(true);
                expect(container2.isContainerRunning()).toBe(false);

                await container1.stop();
                expect(container1.isContainerRunning()).toBe(false);
                expect(container2.isContainerRunning()).toBe(false);
            } finally {
                await fastify1.close();
                await fastify2.close();
            }
        });

        it('should properly cleanup multiple containers', async () => {
            const orderListener = new TestListener();
            const notificationListener = new NotificationListener();

            // Register multiple plugins in the same Fastify instance using encapsulation
            await fastify.register(async (childFastify1) => {
                await childFastify1.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/order-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: orderListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'order-container',
                    autoStartup: false
                });
            });

            await fastify.register(async (childFastify2) => {
                await childFastify2.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/notification-queue',
                    listener: {
                        messageType: NotificationMessage,
                        listener: notificationListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'notification-container',
                    autoStartup: false
                });
            });

            await fastify.ready();

            // Closing should cleanup all containers without errors
            await expect(fastify.close()).resolves.not.toThrow();
        });

        it('should handle different queue configurations per registration', async () => {
            const orderListener = new TestListener();
            const notificationListener = new NotificationListener();

            // Register plugins with different configurations
            await fastify.register(async (childFastify1) => {
                await childFastify1.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/order-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: orderListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'order-container',
                    maxConcurrentMessages: 5,
                    pollTimeout: 10,
                    autoStartup: false
                });
            });

            await fastify.register(async (childFastify2) => {
                await childFastify2.register(sqsListenerPlugin, {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/notification-queue',
                    listener: {
                        messageType: NotificationMessage,
                        listener: notificationListener
                    },
                    sqsClient: mockSqsClient,
                    containerId: 'notification-container',
                    maxConcurrentMessages: 10,
                    pollTimeout: 20,
                    acknowledgementMode: AcknowledgementMode.MANUAL,
                    autoStartup: false
                });
            });

            await fastify.ready();

            // Should register successfully with different configurations
            expect(fastify).toBeDefined();
        });
    });

    describe('Validation Option Tests', () => {
        describe('Validation Options Acceptance', () => {
            it('should accept enableValidation option', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should accept validationFailureMode option', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.THROW
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should accept validatorOptions option', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    validatorOptions: {
                        whitelist: true,
                        forbidNonWhitelisted: true,
                        skipMissingProperties: false
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should accept all validation options together', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.REJECT,
                    validatorOptions: {
                        whitelist: true,
                        forbidNonWhitelisted: true,
                        groups: ['create', 'update'],
                        skipMissingProperties: false,
                        dismissDefaultMessages: false,
                        validationError: {
                            target: false,
                            value: false
                        },
                        stopAtFirstError: false
                    }
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should accept different ValidationFailureMode enum values', async () => {
                const modes = [
                    ValidationFailureMode.THROW,
                    ValidationFailureMode.ACKNOWLEDGE,
                    ValidationFailureMode.REJECT
                ];

                for (const mode of modes) {
                    const testFastify = Fastify({logger: false});
                    const options: FastifySqsListenerOptions = {
                        queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                        listener: {
                            messageType: TestMessage,
                            listener: new TestListener()
                        },
                        sqsClient: mockSqsClient,
                        enableValidation: true,
                        validationFailureMode: mode
                    };

                    await expect(testFastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                    await testFastify.ready();

                    expect(testFastify.hasDecorator('sqsListener')).toBe(true);
                    await testFastify.close();
                }
            });
        });

        describe('Validation Options Integration', () => {
            it('should successfully register with enableValidation and create container', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    autoStartup: false
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
                const container = (fastify as any).sqsListener;
                expect(container).toBeDefined();
                expect(typeof container.start).toBe('function');
                expect(typeof container.stop).toBe('function');
            });

            it('should successfully register with validationFailureMode and create container', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.ACKNOWLEDGE,
                    autoStartup: false
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
                const container = (fastify as any).sqsListener;
                expect(container).toBeDefined();
                expect(typeof container.start).toBe('function');
                expect(typeof container.stop).toBe('function');
            });

            it('should successfully register with validatorOptions and create container', async () => {
                const validatorOptions = {
                    whitelist: true,
                    forbidNonWhitelisted: true,
                    groups: ['test']
                };

                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    validatorOptions,
                    autoStartup: false
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
                const container = (fastify as any).sqsListener;
                expect(container).toBeDefined();
                expect(typeof container.start).toBe('function');
                expect(typeof container.stop).toBe('function');
            });

            it('should successfully register with all validation options and create container', async () => {
                const validatorOptions = {
                    whitelist: true,
                    forbidNonWhitelisted: true,
                    groups: ['create', 'update']
                };

                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.REJECT,
                    validatorOptions,
                    autoStartup: false
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
                const container = (fastify as any).sqsListener;
                expect(container).toBeDefined();
                expect(typeof container.start).toBe('function');
                expect(typeof container.stop).toBe('function');
            });
        });

        describe('Backward Compatibility', () => {
            it('should work without any validation options provided', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should successfully register without validation options and create container', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    autoStartup: false
                    // No validation options provided
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
                const container = (fastify as any).sqsListener;
                expect(container).toBeDefined();
                expect(typeof container.start).toBe('function');
                expect(typeof container.stop).toBe('function');
            });

            it('should maintain existing behavior when validation options are not provided', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    autoStartup: false,
                    maxConcurrentMessages: 5,
                    acknowledgementMode: AcknowledgementMode.MANUAL
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
                
                const container = (fastify as any).sqsListener;
                expect(container).toBeDefined();
            });

            it('should work with partial validation options', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    enableValidation: true
                    // Only enableValidation provided, no validationFailureMode or validatorOptions
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should work with only validationFailureMode provided', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
                    // Only validationFailureMode provided, no enableValidation or validatorOptions
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });

            it('should work with only validatorOptions provided', async () => {
                const options: FastifySqsListenerOptions = {
                    queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                    listener: {
                        messageType: TestMessage,
                        listener: testListener
                    },
                    sqsClient: mockSqsClient,
                    validatorOptions: {
                        whitelist: true
                    }
                    // Only validatorOptions provided, no enableValidation or validationFailureMode
                };

                await expect(fastify.register(sqsListenerPlugin, options)).resolves.not.toThrow();
                await fastify.ready();

                expect(fastify.hasDecorator('sqsListener')).toBe(true);
            });
        });
    });

    describe('Plugin Metadata', () => {
        it('should have correct plugin metadata', () => {
            expect((sqsListenerPlugin as any)[Symbol.for('fastify.display-name')]).toBe('@snow-tzu/fastify-sqs-listener');
            expect((sqsListenerPlugin as any)[Symbol.for('skip-override')]).toBe(true);
        });
    });
});