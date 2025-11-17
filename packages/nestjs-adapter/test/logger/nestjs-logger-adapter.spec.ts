import { Logger } from '@nestjs/common';
import { NestJSLoggerAdapter } from '../../src/logger/nestjs-logger-adapter';

describe('NestJSLoggerAdapter', () => {
  let adapter: NestJSLoggerAdapter;
  let mockNestLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockNestLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    adapter = new NestJSLoggerAdapter(mockNestLogger);
  });

  describe('log', () => {
    it('should delegate to NestJS Logger log method without context parameter when not provided', () => {
      const message = 'Test log message';

      adapter.log(message);

      expect(mockNestLogger.log).toHaveBeenCalledWith(message);
      expect(mockNestLogger.log).toHaveBeenCalledTimes(1);
    });

    it('should delegate to NestJS Logger log method with context when provided', () => {
      const message = 'Test log message';
      const context = 'TestContext';

      adapter.log(message, context);

      expect(mockNestLogger.log).toHaveBeenCalledWith(message, context);
      expect(mockNestLogger.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('error', () => {
    it('should delegate to NestJS Logger error method without optional parameters when not provided', () => {
      const message = 'Test error message';

      adapter.error(message);

      expect(mockNestLogger.error).toHaveBeenCalledWith(message);
      expect(mockNestLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should delegate to NestJS Logger error method with trace only', () => {
      const message = 'Test error message';
      const trace = 'Error: Test error\n    at Object.<anonymous>';

      adapter.error(message, trace);

      expect(mockNestLogger.error).toHaveBeenCalledWith(message, trace);
      expect(mockNestLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should delegate to NestJS Logger error method with trace and context', () => {
      const message = 'Test error message';
      const trace = 'Error: Test error\n    at Object.<anonymous>';
      const context = 'ErrorContext';

      adapter.error(message, trace, context);

      expect(mockNestLogger.error).toHaveBeenCalledWith(message, trace, context);
      expect(mockNestLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('warn', () => {
    it('should delegate to NestJS Logger warn method without context parameter when not provided', () => {
      const message = 'Test warning message';

      adapter.warn(message);

      expect(mockNestLogger.warn).toHaveBeenCalledWith(message);
      expect(mockNestLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should delegate to NestJS Logger warn method with context when provided', () => {
      const message = 'Test warning message';
      const context = 'WarnContext';

      adapter.warn(message, context);

      expect(mockNestLogger.warn).toHaveBeenCalledWith(message, context);
      expect(mockNestLogger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('debug', () => {
    it('should delegate to NestJS Logger debug method without context parameter when not provided', () => {
      const message = 'Test debug message';

      adapter.debug(message);

      expect(mockNestLogger.debug).toHaveBeenCalledWith(message);
      expect(mockNestLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('should delegate to NestJS Logger debug method with context when provided', () => {
      const message = 'Test debug message';
      const context = 'DebugContext';

      adapter.debug(message, context);

      expect(mockNestLogger.debug).toHaveBeenCalledWith(message, context);
      expect(mockNestLogger.debug).toHaveBeenCalledTimes(1);
    });
  });
});
