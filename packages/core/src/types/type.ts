/**
 * Framework-agnostic type alias for class constructors.
 * 
 * This type represents a constructor function that can be instantiated with `new`.
 * It replaces framework-specific type utilities (e.g., NestJS `Type<T>`) to maintain
 * framework independence in the core package.
 * 
 * @template T - The type of instance that the constructor creates
 * 
 * @example
 * ```typescript
 * class MyClass {
 *   constructor(public value: string) {}
 * }
 * 
 * const MyClassType: Type<MyClass> = MyClass;
 * const instance = new MyClassType('hello');
 * ```
 */
export type Type<T = any> = new (...args: any[]) => T;
