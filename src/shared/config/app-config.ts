/**
 * Centralised, typed runtime configuration derived from environment variables.
 *
 * Import this object wherever a config value is needed instead of reading
 * `process.env` directly — keeps access typed, documented, and easy to stub
 * in tests.
 *
 * The dotenv side-effect (loading the .env file) is handled by `env.ts`, which
 * must be imported before this module in the application entry point.
 */
export const AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 3000,

  corsAllowedOrigins: (
    process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim()),

  rateLimitTtlMs: Number(process.env.RATE_LIMIT_TTL_MS) || 60_000,
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,

  // ── Treasury Fiscal Data API ───────────────────────────────────────────────
  treasuryApiBaseUrl:
    process.env.TREASURY_API_BASE_URL ??
    'https://api.fiscaldata.treasury.gov/services/api/fiscal_service',
  treasuryApiTimeoutMs: Number(process.env.TREASURY_API_TIMEOUT_MS) || 10_000,
  treasuryCacheTtlMs: Number(process.env.TREASURY_CACHE_TTL_MS) || 300_000,

  // ── Health check ───────────────────────────────────────────────────────────
  healthCheckTimeoutMs: Number(process.env.HEALTH_CHECK_TIMEOUT_MS) || 5_000,
} as const;

export const isProduction = (): boolean => AppConfig.nodeEnv === 'production';

