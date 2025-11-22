/**
 * Dependency injection tokens for the batch acknowledgement example.
 * 
 * Using symbols instead of strings provides type safety and prevents naming collisions.
 */

export const SQS_CLIENT = Symbol('SQS_CLIENT');
export const ORDER_BATCH_CONTAINER = Symbol('ORDER_BATCH_CONTAINER');