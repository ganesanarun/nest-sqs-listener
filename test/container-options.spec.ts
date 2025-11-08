import {AcknowledgementMode, ContainerOptions, PayloadMessagingConverter} from '../src';

describe('ContainerOptions', () => {
    describe('fluent API chaining', () => {
        it('should return this for chaining on queueNames()', () => {
            const options = new ContainerOptions();
            const result = options.queueNames('test-queue');
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
                .queueNames('test-queue')
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
            options.queueNames('my-queue');

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
            options.queueNames('test-queue');

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
                .queueNames('custom-queue')
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
                .queueNames('partial-queue')
                .maxConcurrentMessages(25);

            const config = options.build();

            expect(config.queueName).toBe('partial-queue');
            expect(config.maxConcurrentMessages).toBe(25);
            expect(config.pollTimeout).toBe(20); // default
            expect(config.visibilityTimeout).toBe(30); // default
            expect(config.autoStartup).toBe(true); // default
            expect(config.acknowledgementMode).toBe(AcknowledgementMode.ON_SUCCESS); // default
        });
    });

    describe('default values', () => {
        it('should use default pollTimeout of 20', () => {
            const options = new ContainerOptions();
            options.queueNames('test-queue');

            const config = options.build();
            expect(config.pollTimeout).toBe(20);
        });

        it('should use default visibilityTimeout of 30', () => {
            const options = new ContainerOptions();
            options.queueNames('test-queue');

            const config = options.build();
            expect(config.visibilityTimeout).toBe(30);
        });

        it('should use default maxConcurrentMessages of 10', () => {
            const options = new ContainerOptions();
            options.queueNames('test-queue');

            const config = options.build();
            expect(config.maxConcurrentMessages).toBe(10);
        });

        it('should use default maxMessagesPerPoll of 10', () => {
            const options = new ContainerOptions();
            options.queueNames('test-queue');

            const config = options.build();
            expect(config.maxMessagesPerPoll).toBe(10);
        });

        it('should use default autoStartup of true', () => {
            const options = new ContainerOptions();
            options.queueNames('test-queue');

            const config = options.build();
            expect(config.autoStartup).toBe(true);
        });

        it('should use default acknowledgementMode of ON_SUCCESS', () => {
            const options = new ContainerOptions();
            options.queueNames('test-queue');

            const config = options.build();
            expect(config.acknowledgementMode).toBe(AcknowledgementMode.ON_SUCCESS);
        });
    });
});
