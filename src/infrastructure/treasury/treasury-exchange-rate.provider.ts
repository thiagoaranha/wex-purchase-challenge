import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, retry, timer } from 'rxjs';
import { AxiosError } from 'axios';
import {
  ExchangeRateProvider,
  ExchangeRateQuote,
} from '../../application/interfaces/exchange-rate-provider';
import { SystemClock } from '../clock/system-clock';
import { TreasuryExchangeRateCache } from './treasury-exchange-rate.cache';
import { TreasuryApiUnavailableError } from './treasury-api-unavailable.error';
import isoTable from './data/iso4217.json';

// ---------------------------------------------------------------------------
// Internal types matching the Treasury Fiscal Data API response schema
// ---------------------------------------------------------------------------

interface TreasuryRateRecord {
  country: string;
  currency: string;
  exchange_rate: string;
  record_date: string;
}

interface TreasuryApiResponse {
  data: TreasuryRateRecord[];
}

interface TreasuryCurrencyRecord {
  country: string;
  currency: string;
}

interface TreasuryAvailabilityResponse {
  data: TreasuryCurrencyRecord[];
}

// ---------------------------------------------------------------------------
// ISO 4217 entry shape (mirrors iso4217.json)
// ---------------------------------------------------------------------------

interface Iso4217Entry {
  iso: string;
  country: string;
  treasuryCurrency: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RATES_ENDPOINT = '/v1/accounting/od/rates_of_exchange';
const AVAILABILITY_FIELDS = 'country,currency';
const RATES_FIELDS = 'country,currency,exchange_rate,record_date';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const SIX_MONTHS = 6;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

@Injectable()
export class TreasuryExchangeRateProvider implements ExchangeRateProvider {
  private readonly logger = new Logger(TreasuryExchangeRateProvider.name);

  /**
   * Lazily populated set of ISO codes confirmed to have data in the Treasury API.
   * Null until the first call triggers initialisation.
   */
  private supportedIsoCodes: Set<string> | null = null;

  /**
   * Promise guard that prevents concurrent initialisation races.
   * The first caller starts the init; subsequent concurrent callers await the same promise.
   */
  private initPromise: Promise<void> | null = null;

  private readonly isoMap: Map<string, Iso4217Entry>;
  private readonly cache: TreasuryExchangeRateCache;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly clock: SystemClock,
  ) {
    this.baseUrl =
      process.env.TREASURY_API_BASE_URL ??
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
    this.timeoutMs = Number(process.env.TREASURY_API_TIMEOUT_MS ?? 10_000);
    const cacheTtlMs = Number(process.env.TREASURY_CACHE_TTL_MS ?? 300_000);

    this.cache = new TreasuryExchangeRateCache(cacheTtlMs);

    // Build O(1) lookup map from the static ISO 4217 reference file
    this.isoMap = new Map(
      (isoTable as Iso4217Entry[]).map((entry) => [entry.iso, entry]),
    );
  }

  // ---------------------------------------------------------------------------
  // ExchangeRateProvider interface
  // ---------------------------------------------------------------------------

  supportsCurrency(isoCode: string): boolean {
    if (!this.isoMap.has(isoCode)) {
      return false;
    }

    // If the supported set is already cached synchronously, answer immediately.
    if (this.supportedIsoCodes !== null) {
      return this.supportedIsoCodes.has(isoCode);
    }

    // The lazy init has not completed yet. We conservatively return true for any
    // ISO code present in our reference table and let getRates() surface a
    // NoValidExchangeRateError if Treasury turns out not to have data for it.
    // This keeps supportsCurrency() synchronous while deferring I/O to getRates().
    return true;
  }

  async getRates(isoCode: string): Promise<ExchangeRateQuote[]> {
    await this.ensureInitialised();

    if (!this.supportedIsoCodes!.has(isoCode)) {
      return [];
    }

    const cached = this.cache.get(isoCode);
    if (cached !== null) {
      return cached;
    }

    const entry = this.isoMap.get(isoCode)!;
    const windowStart = this.buildWindowStartDate();
    const quotes = await this.fetchRatesFromApi(isoCode, entry, windowStart);

    this.cache.set(isoCode, quotes);
    return quotes;
  }

  // ---------------------------------------------------------------------------
  // Lazy initialisation
  // ---------------------------------------------------------------------------

  private ensureInitialised(): Promise<void> {
    if (this.supportedIsoCodes !== null) {
      return Promise.resolve();
    }

    if (this.initPromise === null) {
      this.initPromise = this.buildSupportedIsoCodesCache().finally(() => {
        // Allow re-initialisation if the first attempt failed
        this.initPromise = null;
      });
    }

    return this.initPromise;
  }

  private async buildSupportedIsoCodesCache(): Promise<void> {
    this.logger.log('Initialising Treasury supported currencies list (lazy)');

    const availablePairs = await this.fetchAvailableCurrencyPairs();

    // Build a lookup key identical to the one we use when filtering:
    // "<country>|<treasuryCurrency>"
    const availableKeys = new Set(
      availablePairs.map((pair) =>
        this.buildPairKey(pair.country, pair.currency),
      ),
    );

    const supported = new Set<string>();
    for (const [iso, entry] of this.isoMap) {
      const key = this.buildPairKey(entry.country, entry.treasuryCurrency);
      if (availableKeys.has(key)) {
        supported.add(iso);
      }
    }

    this.supportedIsoCodes = supported;
    this.logger.log(
      `Treasury provider initialised: ${supported.size} supported ISO codes`,
    );
  }

  private async fetchAvailableCurrencyPairs(): Promise<
    TreasuryCurrencyRecord[]
  > {
    const url = `${this.baseUrl}${RATES_ENDPOINT}`;
    const params = {
      fields: AVAILABILITY_FIELDS,
      'page[size]': 500,
    };

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<TreasuryAvailabilityResponse>(url, {
            params,
            timeout: this.timeoutMs,
          })
          .pipe(this.buildRetryPolicy()),
      );

      return response.data.data ?? [];
    } catch (error) {
      this.logger.error(
        'Failed to fetch available currency pairs from Treasury API',
        error,
      );
      // Return empty so init completes; provider will report no currencies supported
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Rate fetching
  // ---------------------------------------------------------------------------

  private async fetchRatesFromApi(
    isoCode: string,
    entry: Iso4217Entry,
    windowStart: string,
  ): Promise<ExchangeRateQuote[]> {
    const url = `${this.baseUrl}${RATES_ENDPOINT}`;
    const params = {
      fields: RATES_FIELDS,
      filter: `country:eq:${entry.country},currency:eq:${entry.treasuryCurrency},record_date:gte:${windowStart}`,
      sort: '-record_date',
      'page[size]': 100,
    };

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<TreasuryApiResponse>(url, {
            params,
            timeout: this.timeoutMs,
          })
          .pipe(this.buildRetryPolicy()),
      );

      return this.normaliseRecords(isoCode, response.data.data ?? []);
    } catch (error) {
      this.logger.error(
        `Failed to fetch exchange rates for ${isoCode} from Treasury API`,
        error,
      );
      throw new TreasuryApiUnavailableError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private normaliseRecords(
    isoCode: string,
    records: TreasuryRateRecord[],
  ): ExchangeRateQuote[] {
    return records.map((record) => ({
      currency: isoCode,
      date: record.record_date,
      rate: record.exchange_rate,
    }));
  }

  private buildWindowStartDate(): string {
    const today = this.clock.now();
    const year = today.getUTCFullYear();
    const monthIndex = today.getUTCMonth() - SIX_MONTHS;
    const day = today.getUTCDate();

    const anchor = new Date(Date.UTC(year, monthIndex, 1));
    const maxDay = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const clampedDay = Math.min(day, maxDay);

    return this.formatIsoDate(
      new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), clampedDay),
      ),
    );
  }

  private formatIsoDate(date: Date): string {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildPairKey(country: string, currency: string): string {
    return `${country}|${currency}`;
  }

  /**
   * RxJS retry policy: up to MAX_RETRIES retries with a fixed delay.
   * 4xx errors are not retried (they indicate a client-side problem).
   */
  private buildRetryPolicy<T>() {
    return retry<T>({
      count: MAX_RETRIES,
      delay: (error: unknown, attempt: number) => {
        const axiosError = error as AxiosError;
        const statusCode = axiosError?.response?.status;

        if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
          // Do not retry client errors
          throw error;
        }

        this.logger.warn(
          `Treasury API request failed (attempt ${attempt}), retrying in ${RETRY_DELAY_MS}ms`,
        );
        return timer(RETRY_DELAY_MS);
      },
    });
  }
}
