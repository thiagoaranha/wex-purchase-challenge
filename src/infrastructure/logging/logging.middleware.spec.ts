import { Test, TestingModule } from '@nestjs/testing';
import { LoggingMiddleware } from './logging.middleware';
import { PinoLoggerService } from './pino-logger.service';
import { Request, Response } from 'express';
import { correlationIdStorage } from './correlation-id.storage';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let loggerService: jest.Mocked<PinoLoggerService>;

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingMiddleware,
        {
          provide: PinoLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    middleware = module.get<LoggingMiddleware>(LoggingMiddleware);
    loggerService = module.get(PinoLoggerService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set x-correlation-id header and run next inside AsyncLocalStorage context', (done) => {
    const req = {
      headers: {},
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      on: jest.fn(),
    } as unknown as Response;

    const next = jest.fn(() => {
      const correlationId = correlationIdStorage.getStore();
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', correlationId);
      done();
    });

    middleware.use(req, res, next);
  });

  it('should reuse existing x-correlation-id header if sent by client', (done) => {
    const req = {
      headers: {
        'x-correlation-id': 'client-correlation-id',
      },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      on: jest.fn(),
    } as unknown as Response;

    const next = jest.fn(() => {
      const correlationId = correlationIdStorage.getStore();
      expect(correlationId).toBe('client-correlation-id');
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'client-correlation-id');
      done();
    });

    middleware.use(req, res, next);
  });

  it('should log HTTP request when response finishes', () => {
    const req = {
      headers: {},
      method: 'GET',
      originalUrl: '/test',
    } as unknown as Request;

    let finishCallback: () => void = () => {};

    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      }),
    } as unknown as Response;

    const next = jest.fn();

    middleware.use(req, res, next);

    finishCallback();

    expect(loggerService.log).toHaveBeenCalledWith(
      expect.stringContaining('GET /test 200 -'),
      'HTTP',
    );
  });
});
