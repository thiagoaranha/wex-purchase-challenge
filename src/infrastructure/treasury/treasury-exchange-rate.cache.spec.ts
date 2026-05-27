import { TreasuryExchangeRateCache } from './treasury-exchange-rate.cache';
import { ExchangeRateQuote } from '../../application/interfaces/exchange-rate-provider';

const ONE_MINUTE_MS = 60_000;

function buildQuote(overrides: Partial<ExchangeRateQuote> = {}): ExchangeRateQuote {
  return {
    currency: 'Brazil-Real',
    date: '2025-03-31',
    rate: '5.75',
    ...overrides,
  };
}

describe('TreasuryExchangeRateCache', () => {
  let cache: TreasuryExchangeRateCache;

  beforeEach(() => {
    cache = new TreasuryExchangeRateCache(ONE_MINUTE_MS);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('should return null for a key that was never stored', () => {
      expect(cache.get('Unknown-Currency')).toBeNull();
    });

    it('should return cached quotes within TTL', () => {
      const quotes = [buildQuote()];

      cache.set('Brazil-Real', quotes);

      expect(cache.get('Brazil-Real')).toEqual(quotes);
    });

    it('should return null and evict the entry after TTL expires', () => {
      const quotes = [buildQuote()];

      cache.set('Brazil-Real', quotes);

      jest.advanceTimersByTime(ONE_MINUTE_MS + 1);

      expect(cache.get('Brazil-Real')).toBeNull();
    });

    it('should return quotes when accessed exactly at TTL boundary', () => {
      const quotes = [buildQuote()];

      cache.set('Brazil-Real', quotes);

      jest.advanceTimersByTime(ONE_MINUTE_MS - 1);

      expect(cache.get('Brazil-Real')).toEqual(quotes);
    });
  });

  describe('set', () => {
    it('should store and retrieve quotes for a given ISO code', () => {
      const quotes = [buildQuote({ currency: 'Euro Zone-Euro' })];

      cache.set('Euro Zone-Euro', quotes);

      expect(cache.get('Euro Zone-Euro')).toEqual(quotes);
    });

    it('should overwrite previously stored quotes for the same key', () => {
      const oldQuotes = [buildQuote({ rate: '5.00' })];
      const newQuotes = [buildQuote({ rate: '5.50' })];

      cache.set('Brazil-Real', oldQuotes);
      cache.set('Brazil-Real', newQuotes);

      expect(cache.get('Brazil-Real')).toEqual(newQuotes);
    });
  });

  describe('invalidate', () => {
    it('should remove a specific cached entry by key', () => {
      cache.set('Brazil-Real', [buildQuote()]);
      cache.set('Euro Zone-Euro', [buildQuote({ currency: 'Euro Zone-Euro' })]);

      cache.invalidate('Brazil-Real');

      expect(cache.get('Brazil-Real')).toBeNull();
      expect(cache.get('Euro Zone-Euro')).not.toBeNull();
    });

    it('should not throw when invalidating a non-existent key', () => {
      expect(() => cache.invalidate('Unknown-Currency')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cached entries', () => {
      cache.set('Brazil-Real', [buildQuote()]);
      cache.set('Euro Zone-Euro', [buildQuote({ currency: 'Euro Zone-Euro' })]);

      cache.clear();

      expect(cache.get('Brazil-Real')).toBeNull();
      expect(cache.get('Euro Zone-Euro')).toBeNull();
    });
  });
});
