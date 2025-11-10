import {DeleteMessageCommand, SQSClient} from '@aws-sdk/client-sqs';
import {MessageContext} from './message-context.interface';
import {SQSMessage, SQSMessageAttributes} from '../types/sqs-types';
import {Logger} from "@nestjs/common";

/**
 * Implementation of MessageContext that wraps an SQS message and provides
 * access to message metadata and acknowledgement functionality.
 * 
 * @template TContext The type of the context object (defaults to void for backward compatibility)
 * @template TResources The type of the resources object (defaults to void for backward compatibility)
 */
export class MessageContextImpl<TContext = void, TResources = void> implements MessageContext<TContext, TResources> {
    constructor(
        private readonly message: SQSMessage,
        private readonly queueUrl: string,
        private readonly sqsClient: SQSClient,
        private readonly logger: Logger,
        private readonly context?: TContext,
        private readonly resources?: TResources
    ) {
    }

    getMessageId(): string {
        return this.message.MessageId || '';
    }

    getReceiptHandle(): string {
        return this.message.ReceiptHandle || '';
    }

    getQueueUrl(): string {
        return this.queueUrl;
    }

    getMessageAttributes(): SQSMessageAttributes {
        return this.message.MessageAttributes || {};
    }

    getSystemAttributes(): Record<string, string> {
        return this.message.Attributes || {};
    }

    getApproximateReceiveCount(): number {
        const attributes = this.getSystemAttributes();
        const receiveCount = attributes['ApproximateReceiveCount'];

        if (!receiveCount) {
            return 0;
        }

        const parsed = parseInt(receiveCount, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    async acknowledge(): Promise<void> {
        try {
            const command = new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: this.message.ReceiptHandle,
            });

            this.logger.debug(`Acknowledging message ${this.message.MessageId}`);
            await this.sqsClient.send(command);
        } catch (error) {
            // Handle errors gracefully - log but don't throw
            // This allows the application to continue processing other messages
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
                `Failed to acknowledge message ${this.message.MessageId}: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined
            );
        }
    }

    getContext(): TContext | undefined {
        return this.context;
    }

    getResources(): TResources | undefined {
        return this.resources;
    }
}
