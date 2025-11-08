// Symbol-based dependency injection tokens for type safety
// Using Symbols prevents naming collisions and provides better IDE support

export const ORDER_SQS_CLIENT = Symbol('ORDER_SQS_CLIENT');
export const ORDER_CONTAINER = Symbol('ORDER_CONTAINER');
export const NOTIFICATION_SQS_CLIENT = Symbol('NOTIFICATION_SQS_CLIENT');
export const NOTIFICATION_CONTAINER = Symbol('NOTIFICATION_CONTAINER');
