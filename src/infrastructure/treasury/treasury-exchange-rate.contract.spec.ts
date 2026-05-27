import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { TreasuryExchangeRateProvider } from './treasury-exchange-rate.provider';
import { Clock } from '../../application/interfaces/clock';
import { HttpService } from '@nestjs/axios';
import brlFixture from './__fixtures__/rates_of_exchange_brl_2026Q1.json';

/**
 * Contract tests using a versioned fixture captured from the real Treasury API.
 *
 * Purpose: verify that our parsing and normalisation logic stays aligned with
 * the actual Treasury response schema. These tests do not make network calls.
 * When the API schema changes, updating this fixture (and fixing any broken
 * assertions) is the explicit signal that the parser needs updating too.
 */

function buildAvailabilityResponseFromFixture() {
  return {
    data: {
      data: [{ country: 'Brazil', currency: 'Real' }],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as unknown as AxiosResponse['config'],
  } as AxiosResponse;
}

function buildRateResponseFromFixture() {
  return {
    data: brlFixture,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as unknown as AxiosResponse['config'],
  } as AxiosResponse;
}

class FakeClock implements Clock {
  now(): Date {
    // Date chosen so the 6-month window covers all fixture records (2025-09-30 to 2026-03-31)
    return new Date('2026-05-26T00:00:00.000Z');
  }
}

describe('TreasuryExchangeRateProvider — contract', () => {
  let provider: TreasuryExchangeRateProvider;

  beforeEach(() => {
    process.env.TREASURY_API_BASE_URL =
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

    let callCount = 0;
    const httpService = {
      get: jest.fn().mockImplementation(() => {
        callCount += 1;
        return of(
          callCount === 1
            ? buildAvailabilityResponseFromFixture()
            : buildRateResponseFromFixture(),
        );
      }),
    };

    provider = new TreasuryExchangeRateProvider(
      httpService as unknown as HttpService,
      new FakeClock(),
    );
  });

  it('should parse the fixture and return correctly shaped ExchangeRateQuote[]', async () => {
    const quotes = await provider.getRates('BRL');

    expect(quotes.length).toBeGreaterThan(0);

    for (const quote of quotes) {
      expect(quote).toMatchObject({
        currency: expect.any(String) as string,
        date: expect.any(String) as string,
        rate: expect.any(String) as string,
      });
    }
  });

  it('should normalise the currency field to ISO code, not Treasury name', async () => {
    const quotes = await provider.getRates('BRL');

    for (const quote of quotes) {
      expect(quote.currency).toBe('BRL');
      expect(quote.currency).not.toBe('Real');
    }
  });

  it('should return dates in YYYY-MM-DD format', async () => {
    const quotes = await provider.getRates('BRL');
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

    for (const quote of quotes) {
      expect(quote.date).toMatch(isoDatePattern);
    }
  });

  it('should return exchange rates as numeric strings', async () => {
    const quotes = await provider.getRates('BRL');

    for (const quote of quotes) {
      expect(Number(quote.rate)).not.toBeNaN();
      expect(Number(quote.rate)).toBeGreaterThan(0);
    }
  });

  it('should contain the exact records present in the fixture', async () => {
    const quotes = await provider.getRates('BRL');

    expect(quotes).toEqual([
      { currency: 'BRL', date: '2026-03-31', rate: '5.254' },
      { currency: 'BRL', date: '2025-12-31', rate: '5.477' },
      { currency: 'BRL', date: '2025-09-30', rate: '5.322' },
    ]);
  });
});
