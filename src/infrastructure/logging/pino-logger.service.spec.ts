import { Test, TestingModule } from '@nestjs/testing';
import { PinoLoggerService } from './pino-logger.service';
import { correlationIdStorage } from './correlation-id.storage';

jest.mock('pino', () => {
  const mockInfo = jest.fn();
  const mockError = jest.fn();
  const mockWarn = jest.fn();
  const mockDebug = jest.fn();
  const mockTrace = jest.fn();
  const mockPino = jest.fn(() => ({
    info: mockInfo,
    error: mockError,
    warn: mockWarn,
    debug: mockDebug,
    trace: mockTrace,
  }));
  return {
    __esModule: true,
    default: mockPino,
  };
});

import pino from 'pino';

describe('PinoLoggerService', () => {
  let service: PinoLoggerService;
  let mockPinoInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinoLoggerService],
    }).compile();

    service = module.get<PinoLoggerService>(PinoLoggerService);
    mockPinoInstance = (pino as any)();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log info messages', () => {
    service.log('test info message', 'TestContext');
    expect(mockPinoInstance.info).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'TestContext' }),
      'test info message',
    );
  });

  it('should include correlationId if present in AsyncLocalStorage', () => {
    correlationIdStorage.run('test-correlation-id', () => {
      service.log('correlated message');
      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'test-correlation-id' }),
        'correlated message',
      );
    });
  });

  it('should log errors with stack trace if message is an Error object', () => {
    const errorObj = new Error('Some database error');
    service.error(errorObj, 'TestContext');
    expect(mockPinoInstance.error).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'TestContext',
        err: expect.objectContaining({
          message: 'Some database error',
        }),
      }),
      'Some database error',
    );
  });

  it('should log warn messages', () => {
    service.warn('warning message');
    expect(mockPinoInstance.warn).toHaveBeenCalled();
  });

  it('should log debug messages', () => {
    service.debug('debug message');
    expect(mockPinoInstance.debug).toHaveBeenCalled();
  });

  it('should log verbose (trace) messages', () => {
    service.verbose('trace message');
    expect(mockPinoInstance.trace).toHaveBeenCalled();
  });
});
