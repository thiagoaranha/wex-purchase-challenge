import { ExchangeRateQuote } from '../../application/interfaces/exchange-rate-provider';

interface CacheEntry {
  quotes: ExchangeRateQuote[];
  expiresAt: number;
}

/**
 * In-memory TTL cache for exchange rate quotes keyed by ISO currency code.
 *
 * Entries are evicted lazily on read rather than through a background sweep,
 * keeping the implementation simple and allocation-free between requests.
 */
export class TreasuryExchangeRateCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs: number) {}

  get(isoCode: string): ExchangeRateQuote[] | null {
    const entry = this.store.get(isoCode);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(isoCode);
      return null;
    }

    return entry.quotes;
  }

  set(isoCode: string, quotes: ExchangeRateQuote[]): void {
    this.store.set(isoCode, {
      quotes,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(isoCode: string): void {
    this.store.delete(isoCode);
  }

  clear(): void {
    this.store.clear();
  }
}
