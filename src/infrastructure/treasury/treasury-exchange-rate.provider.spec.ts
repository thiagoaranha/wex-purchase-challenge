import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import type { HttpService } from '@nestjs/axios';
import { TreasuryExchangeRateProvider } from './treasury-exchange-rate.provider';
import { TreasuryApiUnavailableError } from './treasury-api-unavailable.error';
import { Clock } from '../../application/interfaces/clock';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as unknown as AxiosResponse['config'],
  } as AxiosResponse<T>;
}

/** Minimal availability response listing a few countries */
function buildAvailabilityResponse() {
  return buildAxiosResponse({
    data: [
      { country: 'Brazil', currency: 'Real' },
      { country: 'Euro Zone', currency: 'Euro' },
      { country: 'Canada', currency: 'Dollar' },
      { country: 'Japan', currency: 'Yen' },
    ],
  });
}

/** Rate response for BRL */
function buildBrlRateResponse() {
  return buildAxiosResponse({
    data: [
      {
        country: 'Brazil',
        currency: 'Real',
        exchange_rate: '5.254',
        record_date: '2026-03-31',
      },
      {
        country: 'Brazil',
        currency: 'Real',
        exchange_rate: '5.477',
        record_date: '2025-12-31',
      },
    ],
  });
}

class FakeClock implements Clock {
  now(): Date {
    return new Date('2026-05-26T00:00:00.000Z');
  }
}

function buildMockHttpService(
  availabilityResponse = buildAvailabilityResponse(),
  rateResponse = buildBrlRateResponse(),
) {
  let callCount = 0;
  return {
    get: jest.fn().mockImplementation(() => {
      callCount += 1;
      // First call = availability check, subsequent = rate fetch
      const response = callCount === 1 ? availabilityResponse : rateResponse;
      return of(response);
    }),
    _getCallCount: () => callCount,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TreasuryExchangeRateProvider', () => {
  // -------------------------------------------------------------------------
  // supportsCurrency
  // -------------------------------------------------------------------------

  describe('supportsCurrency', () => {
    it('should return true for an ISO code present in the ISO table', () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      // Before lazy init completes, returns true for any known ISO code
      expect(provider.supportsCurrency('BRL')).toBe(true);
    });

    it('should return false for an ISO code not in the ISO table', () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      expect(provider.supportsCurrency('XXX')).toBe(false);
    });

    it('should return false for USD (not present in Treasury dataset)', async () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      // Trigger lazy init so supportedIsoCodes is populated
      await provider.getRates('BRL');

      expect(provider.supportsCurrency('USD')).toBe(false);
    });

    it('should return true for BRL after lazy init confirms Treasury has it', async () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await provider.getRates('BRL');

      expect(provider.supportsCurrency('BRL')).toBe(true);
    });

    it('should return false for a currency not in the Treasury availability list', async () => {
      // THB (Thailand) is NOT in the mocked availability response
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await provider.getRates('BRL'); // triggers lazy init

      expect(provider.supportsCurrency('THB')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getRates
  // -------------------------------------------------------------------------

  describe('getRates', () => {
    it('should return normalised ExchangeRateQuote[] with ISO code', async () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      const quotes = await provider.getRates('BRL');

      expect(quotes).toEqual([
        { currency: 'BRL', date: '2026-03-31', rate: '5.254' },
        { currency: 'BRL', date: '2025-12-31', rate: '5.477' },
      ]);
    });

    it('should serve subsequent calls from the in-memory cache without extra HTTP calls', async () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await provider.getRates('BRL'); // cold call: 1 availability + 1 rate = 2 HTTP calls
      const callsAfterFirst = httpService.get.mock.calls.length;

      await provider.getRates('BRL'); // should be served from cache
      const callsAfterSecond = httpService.get.mock.calls.length;

      expect(callsAfterSecond).toBe(callsAfterFirst);
    });

    it('should return an empty array when the currency is not in the Treasury supported list', async () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await provider.getRates('BRL'); // trigger lazy init

      // THB is not in the mocked availability list
      const quotes = await provider.getRates('THB');
      expect(quotes).toEqual([]);
    });

    it('should return an empty array when Treasury returns no data for the currency', async () => {
      const emptyRateResponse = buildAxiosResponse({ data: [] });
      let callCount = 0;
      const httpService = {
        get: jest.fn().mockImplementation(() => {
          callCount += 1;
          return of(
            callCount === 1 ? buildAvailabilityResponse() : emptyRateResponse,
          );
        }),
      };

      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      const quotes = await provider.getRates('BRL');
      expect(quotes).toEqual([]);
    });

    it('should include country filter to disambiguate currencies sharing the same name', async () => {
      const httpService = buildMockHttpService();
      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await provider.getRates('BRL');

      const rateCalls = httpService.get.mock.calls.filter(
        ([, config]: [string, { params?: { filter?: string } } | undefined]) =>
          config?.params?.filter?.includes('country:eq:Brazil') &&
          config?.params?.filter?.includes('currency:eq:Real'),
      );

      expect(rateCalls.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('should throw TreasuryApiUnavailableError when HTTP call fails after retries', async () => {
      let callCount = 0;
      const httpService = {
        get: jest.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            // Availability call succeeds
            return of(buildAvailabilityResponse());
          }
          // Rate call always fails
          return throwError(() => new Error('Network error'));
        }),
      };

      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await expect(provider.getRates('BRL')).rejects.toThrow(
        TreasuryApiUnavailableError,
      );
    });

    it('should not retry on 4xx errors', async () => {
      let callCount = 0;
      const clientError = Object.assign(new Error('Bad request'), {
        response: { status: 400 },
      });

      const httpService = {
        get: jest.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            return of(buildAvailabilityResponse());
          }
          return throwError(() => clientError);
        }),
      };

      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      await expect(provider.getRates('BRL')).rejects.toThrow(
        TreasuryApiUnavailableError,
      );

      // Should have attempted the rate call exactly once (no retry on 4xx)
      expect(httpService.get).toHaveBeenCalledTimes(2); // 1 availability + 1 rate
    });

    it('should complete lazy init even if the availability call fails', async () => {
      const httpService = {
        get: jest.fn().mockReturnValue(throwError(() => new Error('Timeout'))),
      };

      const provider = new TreasuryExchangeRateProvider(
        httpService as unknown as HttpService,
        new FakeClock(),
      );

      // getRates for a real ISO code returns [] because the supported set is empty
      const quotes = await provider.getRates('BRL');
      expect(quotes).toEqual([]);
    });
  });
});
