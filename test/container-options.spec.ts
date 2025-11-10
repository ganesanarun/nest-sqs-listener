import {AcknowledgementMode, ContainerOptions, PayloadMessagingConverter} from '../src';
import {ContextResolver, ResourceProvider, ContextKeyGenerator, ResourceCleanup} from '../src/types/context-resource-types';
import {SQSMessageAttributes} from '../src/types/sqs-types';

describe('ContainerOptions', () => {
    describe('fluent API chaining', () => {
        it('should return this for chaining on queueName()', () => {
            const options = new ContainerOptions();

            const result = options.queueName('test-queue');

            expect(result).toBe(options);
        });

        it('should return this for chaining on pollTimeout()', () => {
            const options = new ContainerOptions();

            const result = options.pollTimeout(30);

            expect(result).toBe(options);
        });

        it('should return this for chaining on visibilityTimeout()', () => {
            const options = new ContainerOptions();

            const result = options.visibilityTimeout(60);

            expect(result).toBe(options);
        });

        it('should return this for chaining on maxConcurrentMessages()', () => {
            const options = new ContainerOptions();

            const result = options.maxConcurrentMessages(5);

            expect(result).toBe(options);
        });

        it('should return this for chaining on maxMessagesPerPoll()', () => {
            const options = new ContainerOptions();

            const result = options.maxMessagesPerPoll(10);

            expect(result).toBe(options);
        });

        it('should return this for chaining on autoStartup()', () => {
            const options = new ContainerOptions();

            const result = options.autoStartup(false);

            expect(result).toBe(options);
        });

        it('should return this for chaining on acknowledgementMode()', () => {
            const options = new ContainerOptions();

            const result = options.acknowledgementMode(AcknowledgementMode.MANUAL);

            expect(result).toBe(options);
        });

        it('should return this for chaining on messageConverter()', () => {
            const options = new ContainerOptions();
            const converter: PayloadMessagingConverter<any> = {
                convert: (body: string) => JSON.parse(body),
            };

            const result = options.messageConverter(converter);

            expect(result).toBe(options);
        });

        it('should support method chaining', () => {
            const options = new ContainerOptions();

            const result = options
                .queueName('test-queue')
                .pollTimeout(30)
                .visibilityTimeout(60)
                .maxConcurrentMessages(5)
                .maxMessagesPerPoll(10)
                .autoStartup(false)
                .acknowledgementMode(AcknowledgementMode.MANUAL);

            expect(result).toBe(options);
        });
    });

    describe('configuration setters', () => {
        it('should set queue name', () => {
            const options = new ContainerOptions();
            options.queueName('my-queue');

            const config = options.build();

            expect(config.queueName).toBe('my-queue');
        });

        it('should set poll timeout', () => {
            const options = new ContainerOptions();
            options.pollTimeout(25);

            const config = options.build();

            expect(config.pollTimeout).toBe(25);
        });

        it('should set visibility timeout', () => {
            const options = new ContainerOptions();
            options.visibilityTimeout(45);

            const config = options.build();

            expect(config.visibilityTimeout).toBe(45);
        });

        it('should set max concurrent messages', () => {
            const options = new ContainerOptions();
            options.maxConcurrentMessages(15);

            const config = options.build();

            expect(config.maxConcurrentMessages).toBe(15);
        });

        it('should set max messages per poll', () => {
            const options = new ContainerOptions();
            options.maxMessagesPerPoll(5);

            const config = options.build();

            expect(config.maxMessagesPerPoll).toBe(5);
        });

        it('should set auto startup flag', () => {
            const options = new ContainerOptions();
            options.autoStartup(false);

            const config = options.build();

            expect(config.autoStartup).toBe(false);
        });

        it('should set acknowledgement mode', () => {
            const options = new ContainerOptions();
            options.acknowledgementMode(AcknowledgementMode.ALWAYS);

            const config = options.build();

            expect(config.acknowledgementMode).toBe(AcknowledgementMode.ALWAYS);
        });

        it('should set message converter', () => {
            const options = new ContainerOptions();
            const converter: PayloadMessagingConverter<any> = {
                convert: (body: string) => JSON.parse(body),
            };
            options.messageConverter(converter);

            const config = options.build();

            expect(config.messageConverter).toBe(converter);
        });
    });

    describe('build() method', () => {
        it('should return complete configuration object with defaults', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config).toEqual({
                id: '',
                queueName: 'test-queue',
                pollTimeout: 20,
                visibilityTimeout: 30,
                maxConcurrentMessages: 10,
                maxMessagesPerPoll: 10,
                autoStartup: true,
                acknowledgementMode: AcknowledgementMode.ON_SUCCESS,
                messageConverter: undefined,
            });
        });

        it('should return configuration with custom values', () => {
            const options = new ContainerOptions();
            const converter: PayloadMessagingConverter<any> = {
                convert: (body: string) => JSON.parse(body),
            };
            options
                .queueName('custom-queue')
                .pollTimeout(15)
                .visibilityTimeout(90)
                .maxConcurrentMessages(20)
                .maxMessagesPerPoll(5)
                .autoStartup(false)
                .acknowledgementMode(AcknowledgementMode.MANUAL)
                .messageConverter(converter);

            const config = options.build();

            expect(config).toEqual({
                id: '',
                queueName: 'custom-queue',
                pollTimeout: 15,
                visibilityTimeout: 90,
                maxConcurrentMessages: 20,
                maxMessagesPerPoll: 5,
                autoStartup: false,
                acknowledgementMode: AcknowledgementMode.MANUAL,
                messageConverter: converter,
            });
        });

        it('should return configuration with partial custom values and defaults', () => {
            const options = new ContainerOptions();
            options
                .queueName('partial-queue')
                .maxConcurrentMessages(25);

            const config = options.build();

            expect(config.queueName).toBe('partial-queue');
            expect(config.maxConcurrentMessages).toBe(25);
            expect(config.pollTimeout).toBe(20);
            expect(config.visibilityTimeout).toBe(30);
            expect(config.autoStartup).toBe(true);
            expect(config.acknowledgementMode).toBe(AcknowledgementMode.ON_SUCCESS);
        });
    });

    describe('default values', () => {
        it('should use default pollTimeout of 20', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config.pollTimeout).toBe(20);
        });

        it('should use default visibilityTimeout of 30', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config.visibilityTimeout).toBe(30);
        });

        it('should use default maxConcurrentMessages of 10', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config.maxConcurrentMessages).toBe(10);
        });

        it('should use default maxMessagesPerPoll of 10', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config.maxMessagesPerPoll).toBe(10);
        });

        it('should use default autoStartup of true', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config.autoStartup).toBe(true);
        });

        it('should use default acknowledgementMode of ON_SUCCESS', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            expect(config.acknowledgementMode).toBe(AcknowledgementMode.ON_SUCCESS);
        });
    });

    describe('backward compatibility', () => {
        it('should work with existing ContainerOptions usage without new methods', () => {
            const options = new ContainerOptions();
            const converter: PayloadMessagingConverter<any> = {
                convert: (body: string) => JSON.parse(body),
            };

            // Use only existing methods
            options
                .queueName('legacy-queue')
                .pollTimeout(20)
                .visibilityTimeout(30)
                .maxConcurrentMessages(10)
                .maxMessagesPerPoll(10)
                .autoStartup(true)
                .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                .messageConverter(converter);

            const config = options.build();

            // Verify all existing properties work
            expect(config.queueName).toBe('legacy-queue');
            expect(config.pollTimeout).toBe(20);
            expect(config.visibilityTimeout).toBe(30);
            expect(config.maxConcurrentMessages).toBe(10);
            expect(config.maxMessagesPerPoll).toBe(10);
            expect(config.autoStartup).toBe(true);
            expect(config.acknowledgementMode).toBe(AcknowledgementMode.ON_SUCCESS);
            expect(config.messageConverter).toBe(converter);
        });

        it('should return same config structure for existing usage', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            // Verify config has all expected properties
            expect(config).toHaveProperty('id');
            expect(config).toHaveProperty('queueName');
            expect(config).toHaveProperty('pollTimeout');
            expect(config).toHaveProperty('visibilityTimeout');
            expect(config).toHaveProperty('maxConcurrentMessages');
            expect(config).toHaveProperty('maxMessagesPerPoll');
            expect(config).toHaveProperty('autoStartup');
            expect(config).toHaveProperty('acknowledgementMode');
            expect(config).toHaveProperty('messageConverter');
        });

        it('should not include new context/resource properties when not configured', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue');

            const config = options.build();

            // New properties should not be present or should be undefined
            expect((config as any).contextResolver).toBeUndefined();
            expect((config as any).resourceProvider).toBeUndefined();
            expect((config as any).contextKeyGenerator).toBeUndefined();
            expect((config as any).resourceCleanup).toBeUndefined();
        });
    });

    describe('contextResolver configuration', () => {
        interface TestContext {
            tenantId: string;
            region: string;
        }

        it('should set and retrieve contextResolver', () => {
            const options = new ContainerOptions();
            const resolver: ContextResolver<TestContext> = (attributes: SQSMessageAttributes) => ({
                tenantId: attributes['tenantId']?.StringValue || '',
                region: attributes['region']?.StringValue || '',
            });

            options.contextResolver(resolver);
            const config = options.build();

            expect((config as any).contextResolver).toBe(resolver);
        });

        it('should include contextResolver in build() output', () => {
            const options = new ContainerOptions();
            const resolver: ContextResolver<TestContext> = (attributes: SQSMessageAttributes) => ({
                tenantId: attributes['tenantId']?.StringValue || '',
                region: attributes['region']?.StringValue || '',
            });

            options.queueName('test-queue').contextResolver(resolver);
            const config = options.build();

            expect((config as any).contextResolver).toBeDefined();
            expect((config as any).contextResolver).toBe(resolver);
        });

        it('should support method chaining with contextResolver', () => {
            const options = new ContainerOptions();
            const resolver: ContextResolver<TestContext> = (attributes: SQSMessageAttributes) => ({
                tenantId: attributes['tenantId']?.StringValue || '',
                region: attributes['region']?.StringValue || '',
            });

            const result = options
                .queueName('test-queue')
                .contextResolver(resolver)
                .pollTimeout(20);

            expect(result).toBe(options);
        });
    });

    describe('resourceProvider configuration', () => {
        interface TestContext {
            tenantId: string;
        }

        interface TestResources {
            dataSource: { name: string };
        }

        it('should set and retrieve resourceProvider', () => {
            const options = new ContainerOptions();
            const provider: ResourceProvider<TestContext, TestResources> = async (context: TestContext) => ({
                dataSource: { name: `ds-${context.tenantId}` },
            });

            options.resourceProvider(provider);
            const config = options.build();

            expect((config as any).resourceProvider).toBe(provider);
        });

        it('should include resourceProvider in build() output', () => {
            const options = new ContainerOptions();
            const provider: ResourceProvider<TestContext, TestResources> = async (context: TestContext) => ({
                dataSource: { name: `ds-${context.tenantId}` },
            });

            options.queueName('test-queue').resourceProvider(provider);
            const config = options.build();

            expect((config as any).resourceProvider).toBeDefined();
            expect((config as any).resourceProvider).toBe(provider);
        });

        it('should support method chaining with resourceProvider', () => {
            const options = new ContainerOptions();
            const provider: ResourceProvider<TestContext, TestResources> = async (context: TestContext) => ({
                dataSource: { name: `ds-${context.tenantId}` },
            });

            const result = options
                .queueName('test-queue')
                .resourceProvider(provider)
                .pollTimeout(20);

            expect(result).toBe(options);
        });
    });

    describe('contextKeyGenerator configuration', () => {
        interface TestContext {
            tenantId: string;
            region: string;
        }

        it('should set and retrieve contextKeyGenerator', () => {
            const options = new ContainerOptions();
            const generator: ContextKeyGenerator<TestContext> = (context: TestContext) => 
                `${context.tenantId}-${context.region}`;

            options.contextKeyGenerator(generator);
            const config = options.build();

            expect((config as any).contextKeyGenerator).toBe(generator);
        });

        it('should include contextKeyGenerator in build() output', () => {
            const options = new ContainerOptions();
            const generator: ContextKeyGenerator<TestContext> = (context: TestContext) => 
                `${context.tenantId}-${context.region}`;

            options.queueName('test-queue').contextKeyGenerator(generator);
            const config = options.build();

            expect((config as any).contextKeyGenerator).toBeDefined();
            expect((config as any).contextKeyGenerator).toBe(generator);
        });

        it('should support method chaining with contextKeyGenerator', () => {
            const options = new ContainerOptions();
            const generator: ContextKeyGenerator<TestContext> = (context: TestContext) => 
                `${context.tenantId}-${context.region}`;

            const result = options
                .queueName('test-queue')
                .contextKeyGenerator(generator)
                .pollTimeout(20);

            expect(result).toBe(options);
        });
    });

    describe('resourceCleanup configuration', () => {
        interface TestResources {
            dataSource: { destroy: () => Promise<void> };
        }

        it('should set and retrieve resourceCleanup', () => {
            const options = new ContainerOptions();
            const cleanup: ResourceCleanup<TestResources> = async (resources: TestResources) => {
                await resources.dataSource.destroy();
            };

            options.resourceCleanup(cleanup);
            const config = options.build();

            expect((config as any).resourceCleanup).toBe(cleanup);
        });

        it('should include resourceCleanup in build() output', () => {
            const options = new ContainerOptions();
            const cleanup: ResourceCleanup<TestResources> = async (resources: TestResources) => {
                await resources.dataSource.destroy();
            };

            options.queueName('test-queue').resourceCleanup(cleanup);
            const config = options.build();

            expect((config as any).resourceCleanup).toBeDefined();
            expect((config as any).resourceCleanup).toBe(cleanup);
        });

        it('should support method chaining with resourceCleanup', () => {
            const options = new ContainerOptions();
            const cleanup: ResourceCleanup<TestResources> = async (resources: TestResources) => {
                await resources.dataSource.destroy();
            };

            const result = options
                .queueName('test-queue')
                .resourceCleanup(cleanup)
                .pollTimeout(20);

            expect(result).toBe(options);
        });
    });

    describe('build() method with new configuration', () => {
        interface TestContext {
            tenantId: string;
            region: string;
        }

        interface TestResources {
            dataSource: { name: string };
        }

        it('should include all new configuration options in build() output', () => {
            const options = new ContainerOptions();
            const resolver: ContextResolver<TestContext> = (attributes: SQSMessageAttributes) => ({
                tenantId: attributes['tenantId']?.StringValue || '',
                region: attributes['region']?.StringValue || '',
            });
            const provider: ResourceProvider<TestContext, TestResources> = async (context: TestContext) => ({
                dataSource: { name: `ds-${context.tenantId}` },
            });
            const generator: ContextKeyGenerator<TestContext> = (context: TestContext) => 
                `${context.tenantId}-${context.region}`;
            const cleanup: ResourceCleanup<TestResources> = async (resources: TestResources) => {
                // cleanup logic
            };

            options
                .queueName('test-queue')
                .contextResolver(resolver)
                .resourceProvider(provider)
                .contextKeyGenerator(generator)
                .resourceCleanup(cleanup);

            const config = options.build();

            expect((config as any).contextResolver).toBe(resolver);
            expect((config as any).resourceProvider).toBe(provider);
            expect((config as any).contextKeyGenerator).toBe(generator);
            expect((config as any).resourceCleanup).toBe(cleanup);
        });

        it('should maintain backward compatibility when new options are not configured', () => {
            const options = new ContainerOptions();
            options.queueName('test-queue').pollTimeout(20);

            const config = options.build();

            // Existing properties should work
            expect(config.queueName).toBe('test-queue');
            expect(config.pollTimeout).toBe(20);
            
            // New properties should be undefined
            expect((config as any).contextResolver).toBeUndefined();
            expect((config as any).resourceProvider).toBeUndefined();
            expect((config as any).contextKeyGenerator).toBeUndefined();
            expect((config as any).resourceCleanup).toBeUndefined();
        });

        it('should work with partial new configuration', () => {
            const options = new ContainerOptions();
            const resolver: ContextResolver<TestContext> = (attributes: SQSMessageAttributes) => ({
                tenantId: attributes['tenantId']?.StringValue || '',
                region: attributes['region']?.StringValue || '',
            });

            options
                .queueName('test-queue')
                .contextResolver(resolver);

            const config = options.build();

            expect((config as any).contextResolver).toBe(resolver);
            expect((config as any).resourceProvider).toBeUndefined();
            expect((config as any).contextKeyGenerator).toBeUndefined();
            expect((config as any).resourceCleanup).toBeUndefined();
        });
    });
});
