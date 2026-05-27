import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { TreasuryUnavailableExceptionFilter } from './treasury-unavailable-exception.filter';
import { TreasuryApiUnavailableError } from '../../../../infrastructure/treasury/treasury-api-unavailable.error';

function buildMockHost(): ArgumentsHost {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
  const mockSwitchToHttp = jest
    .fn()
    .mockReturnValue({ getResponse: mockGetResponse });

  return { switchToHttp: mockSwitchToHttp } as unknown as ArgumentsHost;
}

describe('TreasuryUnavailableExceptionFilter', () => {
  let filter: TreasuryUnavailableExceptionFilter;

  beforeEach(() => {
    filter = new TreasuryUnavailableExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should respond with 503 status code', () => {
    const host = buildMockHost();
    const error = new TreasuryApiUnavailableError();

    filter.catch(error, host);

    const response = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('should include statusCode, error, and message fields in the response body', () => {
    const host = buildMockHost();
    const error = new TreasuryApiUnavailableError();

    filter.catch(error, host);

    const response = host.switchToHttp().getResponse<{
      status: jest.Mock<{ json: jest.Mock }>;
    }>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const jsonBody = response.status.mock.results[0]?.value.json.mock
      .calls[0][0] as unknown;

    expect(jsonBody).toMatchObject({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message: error.message,
    });
  });
});
