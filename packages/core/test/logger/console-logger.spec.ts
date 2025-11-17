import { ConsoleLogger } from '../../src/logger/console-logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('log', () => {
    it('should log message with default context', () => {
      logger = new ConsoleLogger('TestContext');

      logger.log('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[TestContext] Test message');
    });

    it('should log message with overridden context', () => {

      logger = new ConsoleLogger('DefaultContext');


      logger.log('Test message', 'OverriddenContext');


      expect(consoleLogSpy).toHaveBeenCalledWith('[OverriddenContext] Test message');
    });

    it('should log message with SQS as default when no context provided', () => {

      logger = new ConsoleLogger();


      logger.log('Test message');


      expect(consoleLogSpy).toHaveBeenCalledWith('[SQS] Test message');
    });
  });

  describe('error', () => {
    it('should log error message with default context', () => {

      logger = new ConsoleLogger('TestContext');


      logger.error('Error message');


      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Error message');
    });

    it('should log error message with trace', () => {
      logger = new ConsoleLogger('TestContext');
      const trace = 'Error: Test error\n    at Object.<anonymous>';

      logger.error('Error message', trace);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(trace);
    });

    it('should log error message with overridden context', () => {

      logger = new ConsoleLogger('DefaultContext');


      logger.error('Error message', undefined, 'OverriddenContext');


      expect(consoleErrorSpy).toHaveBeenCalledWith('[OverriddenContext] Error message');
    });

    it('should log error message with SQS as default when no context provided', () => {

      logger = new ConsoleLogger();


      logger.error('Error message');


      expect(consoleErrorSpy).toHaveBeenCalledWith('[SQS] Error message');
    });
  });

  describe('warn', () => {
    it('should log warning message with default context', () => {

      logger = new ConsoleLogger('TestContext');


      logger.warn('Warning message');


      expect(consoleWarnSpy).toHaveBeenCalledWith('[TestContext] Warning message');
    });

    it('should log warning message with overridden context', () => {

      logger = new ConsoleLogger('DefaultContext');


      logger.warn('Warning message', 'OverriddenContext');


      expect(consoleWarnSpy).toHaveBeenCalledWith('[OverriddenContext] Warning message');
    });

    it('should log warning message with SQS as default when no context provided', () => {

      logger = new ConsoleLogger();


      logger.warn('Warning message');


      expect(consoleWarnSpy).toHaveBeenCalledWith('[SQS] Warning message');
    });
  });

  describe('debug', () => {
    it('should log debug message with default context', () => {

      logger = new ConsoleLogger('TestContext');


      logger.debug('Debug message');


      expect(consoleDebugSpy).toHaveBeenCalledWith('[TestContext] Debug message');
    });

    it('should log debug message with overridden context', () => {

      logger = new ConsoleLogger('DefaultContext');


      logger.debug('Debug message', 'OverriddenContext');


      expect(consoleDebugSpy).toHaveBeenCalledWith('[OverriddenContext] Debug message');
    });

    it('should log debug message with SQS as default when no context provided', () => {

      logger = new ConsoleLogger();


      logger.debug('Debug message');


      expect(consoleDebugSpy).toHaveBeenCalledWith('[SQS] Debug message');
    });
  });
});
