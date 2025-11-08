// Symbol-based dependency injection tokens for type safety
// Using Symbols prevents naming collisions and provides better IDE support

export const SQS_CLIENT = Symbol('SQS_CLIENT');
export const ORDER_CONTAINER = Symbol('ORDER_CONTAINER');
