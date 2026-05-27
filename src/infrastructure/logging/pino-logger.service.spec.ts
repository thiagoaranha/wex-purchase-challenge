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
  let mockPinoInstance: jest.Mocked<{
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    trace: jest.Mock;
  }>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PinoLoggerService],
    }).compile();

    service = module.get<PinoLoggerService>(PinoLoggerService);
    mockPinoInstance = pino() as unknown as jest.Mocked<{
      info: jest.Mock;
      error: jest.Mock;
      warn: jest.Mock;
      debug: jest.Mock;
      trace: jest.Mock;
    }>;
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
        }) as unknown,
      }) as unknown,
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

  describe('buildLogPayload branches', () => {
    it('should merge payload when message is a non-Error object', () => {
      const objMessage = { key: 'value', status: 200 };

      service.log(objMessage);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'value', status: 200 }),
      );
    });

    it('should unwrap single-element extra array into a scalar', () => {
      const extraData = { requestId: '123' };

      service.log('message with single extra', extraData, 'TestContext');

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'TestContext',
          extra: extraData,
        }),
        'message with single extra',
      );
    });

    it('should keep multiple extra params as an array', () => {
      const extra1 = { a: 1 };
      const extra2 = { b: 2 };

      service.log(
        'message with multiple extras',
        extra1,
        extra2,
        'TestContext',
      );

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'TestContext',
          extra: [extra1, extra2],
        }),
        'message with multiple extras',
      );
    });

    it('should treat non-string last param as extra, not context', () => {
      const extraData = { code: 'ERR_TIMEOUT' };

      service.log('some message', extraData);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({ extra: extraData }),
        'some message',
      );
    });
  });

  describe('payload-only path (object message without message string)', () => {
    const objectPayload = { action: 'health-check' };

    it('should call info with payload only when message is an object', () => {
      service.log(objectPayload);
      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'health-check' }),
      );
    });

    it('should call error with payload only when message is an object', () => {
      service.error(objectPayload);
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'health-check' }),
      );
    });

    it('should call warn with payload only when message is an object', () => {
      service.warn(objectPayload);
      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'health-check' }),
      );
    });

    it('should call debug with payload only when message is an object', () => {
      service.debug(objectPayload);
      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'health-check' }),
      );
    });

    it('should call trace with payload only when message is an object', () => {
      service.verbose(objectPayload);
      expect(mockPinoInstance.trace).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'health-check' }),
      );
    });
  });
});
