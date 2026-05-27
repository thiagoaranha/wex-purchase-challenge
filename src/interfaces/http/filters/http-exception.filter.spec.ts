import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import * as AppConfig from '../../../shared/config/app-config';

function buildMockHost(method = 'GET', path = '/purchase'): ArgumentsHost {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
  const mockGetRequest = jest.fn().mockReturnValue({ method, path });
  const mockSwitchToHttp = jest.fn().mockReturnValue({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
  });

  return { switchToHttp: mockSwitchToHttp } as unknown as ArgumentsHost;
}

function getJsonBody(host: ArgumentsHost): Record<string, unknown> {
  const response = host.switchToHttp().getResponse<{
    status: jest.Mock<{ json: jest.Mock }>;
  }>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const jsonBody = response.status.mock.results[0].value.json.mock.calls[0][0];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return jsonBody;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn(AppConfig, 'isProduction').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HTTP status code', () => {
    it('should respond with the exception status code', () => {
      const host = buildMockHost();
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      const response = host.switchToHttp().getResponse<{ status: jest.Mock }>();
      expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });

  describe('response body — string exception message', () => {
    it('should wrap a plain string response into { statusCode, message }', () => {
      const host = buildMockHost();
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(getJsonBody(host)).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
      });
    });
  });

  describe('response body — object exception message', () => {
    it('should spread an object response directly into the body', () => {
      const host = buildMockHost();
      const exception = new HttpException(
        {
          statusCode: 422,
          message: ['field is required'],
          error: 'Unprocessable Entity',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      filter.catch(exception, host);

      expect(getJsonBody(host)).toMatchObject({
        statusCode: 422,
        message: ['field is required'],
        error: 'Unprocessable Entity',
      });
    });
  });

  describe('stack trace suppression', () => {
    it('should preserve the stack field outside production', () => {
      jest.spyOn(AppConfig, 'isProduction').mockReturnValue(false);

      const host = buildMockHost();
      const exception = new HttpException(
        {
          statusCode: 500,
          message: 'Internal error',
          stack: 'Error\n  at ...',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, host);

      expect(getJsonBody(host)).toHaveProperty('stack');
    });

    it('should strip the stack field in production', () => {
      jest.spyOn(AppConfig, 'isProduction').mockReturnValue(true);

      const host = buildMockHost();
      const exception = new HttpException(
        {
          statusCode: 500,
          message: 'Internal error',
          stack: 'Error\n  at ...',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, host);

      expect(getJsonBody(host)).not.toHaveProperty('stack');
    });
  });

  describe('logging behaviour', () => {
    it('should call logger.error for 5xx exceptions', () => {
      const host = buildMockHost('POST', '/purchase');
      const exception = new HttpException(
        'Internal error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const loggerErrorSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .spyOn((filter as any).logger, 'error')
        .mockImplementation();

      filter.catch(exception, host);

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should call logger.warn for 4xx exceptions', () => {
      const host = buildMockHost('GET', '/purchase/abc');
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const loggerWarnSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .spyOn((filter as any).logger, 'warn')
        .mockImplementation();

      filter.catch(exception, host);

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should not log logger.error for 4xx exceptions', () => {
      const host = buildMockHost();
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
      );
      const loggerErrorSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .spyOn((filter as any).logger, 'error')
        .mockImplementation();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      jest.spyOn((filter as any).logger, 'warn').mockImplementation();

      filter.catch(exception, host);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });
});
