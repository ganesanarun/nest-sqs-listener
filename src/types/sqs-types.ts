import {Message, MessageAttributeValue} from '@aws-sdk/client-sqs';

/**
 * SQS Message type - re-export from AWS SDK
 */
export type SQSMessage = Message;

/**
 * SQS Message Attribute value - re-export from AWS SDK
 */
export type SQSMessageAttributeValue = MessageAttributeValue;

/**
 * SQS Message Attributes collection
 */
export interface SQSMessageAttributes {
    [key: string]: SQSMessageAttributeValue;
}
