# ADR 0004: Exchange Rate Integration Strategy

## Status
Accepted

## Context
When retrieving a purchase, we must convert the USD amount to a target currency using the official Treasury Reporting Rates of Exchange API. The conversion requires obtaining the most recent rate available on or before the purchase transaction date. If no rate is available within a 6-month window prior to the transaction date, the conversion must be rejected.

## Decision
We implemented a robust retrieval, cache, and filter pipeline inside **`TreasuryExchangeRateProvider`**:

1. **6-Month Lookback Fetch**: When fetching rates, the provider queries the Treasury API using a date filter starting 6 months before the purchase date (`record_date:gte:<window_start>`) to fetch a chronologically ordered array of rates.
2. **Rate Selection Logic**: The application layer selects the most recent rate that is on or before the transaction date (`rateDate <= purchaseDate`). If the filtered array is empty, a `NoValidExchangeRateError` is thrown.
3. **Optimized Caching**: An in-memory cache (`TreasuryExchangeRateCache`) with a configurable time-to-live (`TREASURY_CACHE_TTL_MS`, default 5 minutes) stores rate results per currency, avoiding redundant downstream HTTP requests.
4. **Resiliency**: We wrapped outgoing API calls with an RxJS-based retry policy (`retry`) that triggers up to 2 retries (3 total attempts) with a delay of 500ms on network failures or server-side (5xx) errors. Client-side errors (4xx) are failed immediately.
5. **Circuit Protection**: Timeout limits (`TREASURY_API_TIMEOUT_MS`, default 10 seconds) prevent downstream API latency from blocking server workers indefinitely.

## Consequences
- **Reliable Date-Matching**: Correctly matches the closest rate available on or before the purchase date, up to 6 months before.
- **Resource Protection**: Prevents rate-limiting and performance degradation of the Treasury API via aggressive caching of fetched rates.
- **Robust Failure Modes**: Gracefully handles Treasury API downtime by returning a structured `503 Service Unavailable` response via the `TreasuryUnavailableExceptionFilter`.
