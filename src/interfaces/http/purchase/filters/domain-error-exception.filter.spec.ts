import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { DomainErrorExceptionFilter } from './domain-error-exception.filter';
import { DomainError } from '../../../../domain/errors/domain-error';
import {
  InvalidCurrencyCodeError,
  InvalidDescriptionError,
  InvalidExchangeRateError,
  InvalidMoneyError,
  InvalidPurchaseIdError,
  InvalidTransactionDateError,
  PurchaseAmountMustBeUsdError,
} from '../../../../domain/errors/purchase-domain-errors';
import {
  NoValidExchangeRateError,
  UnsupportedExchangeRateCurrencyError,
} from '../../../../application/errors/exchange-rate-conversion.error';
import { PurchaseNotFoundError } from '../../../../application/errors/purchase-not-found.error';

function buildMockHost(): ArgumentsHost {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
  const mockSwitchToHttp = jest
    .fn()
    .mockReturnValue({ getResponse: mockGetResponse });

  return { switchToHttp: mockSwitchToHttp } as unknown as ArgumentsHost;
}

function captureJsonBody(host: ArgumentsHost): Record<string, unknown> {
  const response = host.switchToHttp().getResponse<{
    status: jest.Mock<{ json: jest.Mock }>;
  }>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return response.status.mock.results[0]?.value.json.mock
    .calls[0][0] as Record<string, unknown>;
}

function captureStatusCode(host: ArgumentsHost): number {
  const response = host.switchToHttp().getResponse<{ status: jest.Mock }>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return response.status.mock.calls[0][0] as number;
}

describe('DomainErrorExceptionFilter', () => {
  let filter: DomainErrorExceptionFilter;

  beforeEach(() => {
    filter = new DomainErrorExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HTTP status code mapping', () => {
    const cases: Array<[string, DomainError, HttpStatus]> = [
      [
        'InvalidPurchaseIdError → 404',
        new InvalidPurchaseIdError('bad-id'),
        HttpStatus.NOT_FOUND,
      ],
      [
        'InvalidDescriptionError → 422',
        new InvalidDescriptionError('required', ''),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [
        'InvalidTransactionDateError → 422',
        new InvalidTransactionDateError('not-a-date'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [
        'InvalidMoneyError → 422',
        new InvalidMoneyError('non_positive', '-10'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [
        'InvalidCurrencyCodeError → 400',
        new InvalidCurrencyCodeError('TOOLONG'),
        HttpStatus.BAD_REQUEST,
      ],
      [
        'InvalidExchangeRateError → 422',
        new InvalidExchangeRateError('non_positive', '-5'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [
        'PurchaseAmountMustBeUsdError → 422',
        new PurchaseAmountMustBeUsdError('EUR'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [
        'PurchaseNotFoundError → 404',
        new PurchaseNotFoundError('some-uuid'),
        HttpStatus.NOT_FOUND,
      ],
      [
        'UnsupportedExchangeRateCurrencyError → 422',
        new UnsupportedExchangeRateCurrencyError('XYZ'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [
        'NoValidExchangeRateError → 422',
        new NoValidExchangeRateError('BRL', '2020-01-01'),
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
    ];

    it.each(cases)('%s', (_label, error, expectedStatus) => {
      const host = buildMockHost();
      filter.catch(error, host);
      expect(captureStatusCode(host)).toBe(expectedStatus);
    });
  });

  describe('response body shape', () => {
    it('should always include statusCode, error, code, and message', () => {
      const host = buildMockHost();
      const error = new PurchaseNotFoundError('abc-123');

      filter.catch(error, host);

      expect(captureJsonBody(host)).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        code: 'PURCHASE_NOT_FOUND',
        message: error.message,
      });
    });

    it('should include the domain error code in the response body', () => {
      const host = buildMockHost();
      const error = new NoValidExchangeRateError('BRL', '2023-01-01');

      filter.catch(error, host);

      expect(captureJsonBody(host)).toMatchObject({
        code: 'NO_VALID_EXCHANGE_RATE',
      });
    });
  });

  describe('unknown DomainError code fallback', () => {
    it('should respond with 500 for an unmapped DomainError code', () => {
      class UnknownDomainError extends DomainError {
        readonly code = 'UNKNOWN_CODE_XYZ';

        constructor() {
          super('Unexpected domain error');
        }
      }

      const host = buildMockHost();
      filter.catch(new UnknownDomainError(), host);

      expect(captureStatusCode(host)).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should include error: "Internal Server Error" for unknown codes', () => {
      class UnknownDomainError extends DomainError {
        readonly code = 'UNKNOWN_CODE_XYZ';

        constructor() {
          super('Unexpected domain error');
        }
      }

      const host = buildMockHost();
      filter.catch(new UnknownDomainError(), host);

      expect(captureJsonBody(host)).toMatchObject({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
      });
    });
  });

  describe('logging behaviour', () => {
    it('should call logger.warn for 4xx errors', () => {
      const host = buildMockHost();
      const error = new PurchaseNotFoundError('some-id');
      const loggerWarnSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .spyOn((filter as any).logger, 'warn')
        .mockImplementation();

      filter.catch(error, host);

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should call logger.error for unmapped (5xx fallback) errors', () => {
      class UnknownDomainError extends DomainError {
        readonly code = 'UNKNOWN_CODE_XYZ';

        constructor() {
          super('Unexpected domain error');
        }
      }

      const host = buildMockHost();
      const loggerErrorSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .spyOn((filter as any).logger, 'error')
        .mockImplementation();

      filter.catch(new UnknownDomainError(), host);

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call logger.error for 4xx errors', () => {
      const host = buildMockHost();
      const error = new InvalidCurrencyCodeError('XX');
      const loggerErrorSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .spyOn((filter as any).logger, 'error')
        .mockImplementation();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      jest.spyOn((filter as any).logger, 'warn').mockImplementation();

      filter.catch(error, host);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });
});
