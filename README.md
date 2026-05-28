# WEX Purchase Currency Conversion API

A production-oriented, high-quality backend service built with NestJS, TypeScript, and PostgreSQL. It stores purchase transactions in United States Dollars (USD) and retrieves them converted to other target currencies supported by the US Treasury Reporting Rates of Exchange API.

The service follows **Domain-Driven Design (DDD)** and **Hexagonal Architecture** principles, maintaining strict decoupling of business rules from database access, frameworks, and third-party APIs.

---

## Features & Requirements

- **Store Purchase Transaction**:
  - Validates description length (must be between 1 and 50 characters).
  - Validates transaction date (must be in `YYYY-MM-DD` ISO-8601 format).
  - Validates purchase amount (must be a positive decimal string with up to 2 decimal places).
  - Auto-generates a unique UUID identifier.
- **Currency Conversion**:
  - Retrieves a purchase transaction and converts its USD value to a target currency.
  - Queries exchange rates from the US Treasury API active on or before the purchase date.
  - Rejects conversion if no valid exchange rate is found within a 6-month window prior to the purchase transaction.
  - Rounds converted values to exactly two decimal places using round-half-up math.

---

## Architectural Decisions

Detailed design documents are stored under `docs/adr/`:
1. **[ADR 0001: DDD and Hexagonal Architecture](./docs/adr/0001-ddd-hexagonal-architecture.md)**: Isolation of core domain models and application use cases from controllers and database drivers.
2. **[ADR 0002: PostgreSQL and Prisma ORM](./docs/adr/0002-postgresql-prisma.md)**: Secure schema management and type-safe query building.
3. **[ADR 0003: Fixed-Point Currency Math](./docs/adr/0003-decimal-money.md)**: Avoidance of IEEE 754 precision drift by using native Javascript `bigint` types for core currency operations.
4. **[ADR 0004: Exchange Rate Integration Strategy](./docs/adr/0004-exchange-rate-strategy.md)**: 6-month query lookback window, API retry mechanisms, and HTTP response caching.
5. **[ADR 0005: JWT Authentication Strategy](./docs/adr/0005-jwt-authentication.md)**: Stateless M2M authentication decoupled via the `ITokenValidator` port.

---

## Prerequisites

- **Node.js**: v20 or newer
- **Package Manager**: `pnpm` (v8 or newer recommended)
- **Local Infrastructure**: Docker & Docker Compose
- **Git**

To enable and install `pnpm` globally via Corepack, run:
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Environment Variables

Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Configuration Glossary
| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Application environment status (`development`, `production`, `test`). | `development` |
| `PORT` | Local HTTP port the NestJS server binds to. | `3000` |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. | `postgresql://wex_user:wex_password@localhost:5432/wex_db?schema=public` |
| `TREASURY_API_BASE_URL` | Base URL of the US Treasury Fiscal Data API. | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service` |
| `CORS_ALLOWED_ORIGINS` | Permitted cross-origin endpoints. | `http://localhost:3000` |
| `RATE_LIMIT_TTL_MS` | Rate limiter tracking window in milliseconds. | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests allowed per client window. | `30` |
| `TREASURY_API_TIMEOUT_MS` | Timeout for outgoing Treasury HTTP requests. | `10000` |
| `TREASURY_CACHE_TTL_MS` | Duration in milliseconds that exchange rates are cached. | `300000` (5 mins) |
| `HEALTH_CHECK_TIMEOUT_MS` | Timeout for liveness and readiness probes. | `5000` |

> [!WARNING]
> **CORS Security**: Cross-Origin Resource Sharing is enabled on the server. By default, it blocks all requests except those from origins listed in `CORS_ALLOWED_ORIGINS` (using only `GET` and `POST` methods, and restricting headers to `Content-Type` and `Accept`). For production deployment, ensure the appropriate client domains are added to this list. Refer to the **[Operations Runbook](./docs/runbook.md)** for details.

---

## Local Setup & Development Flow

> [!TIP]
> **Quick Start**: You can spin up the entire local environment (including starting Docker containers, running database migrations, and launching the NestJS server in watch mode) with a single command:
> ```bash
> pnpm dev
> ```
> *(Make sure Docker Desktop is running and you have configured the `.env` file first).*

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Launch Local Backing Services (Docker)
Start the database service in the background:
```bash
docker compose up -d --wait
```

### 3. Generate Prisma Client
Generate type definitions for database interaction:
```bash
pnpm prisma:generate
```

### 4. Apply Database Migrations
Run schema updates to set up DB tables:
```bash
pnpm prisma:migrate:deploy
```

### 5. Start Development Server
Starts the NestJS engine in watch mode:
```bash
pnpm start:dev
```

### 6. Interactive OpenAPI/Swagger Documentation
Once the server is running, the complete API documentation can be accessed in your browser at:
- **Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)

> [!TIP]
> **How to Authenticate in Swagger**: The API requires a JWT token. Click the **Authorize 🔓** button at the top of the Swagger page. Since we use an OAuth2 Password flow for convenience, enter your `AUTH_CLIENT_ID` in the **username** field and `AUTH_CLIENT_SECRET` in the **password** field. Swagger will automatically fetch the token and inject it into all subsequent requests.

---

## Available Scripts

Manage your local pipeline using the following `package.json` scripts:
```bash
pnpm build                   # Compiles the TypeScript application to /dist
pnpm dev                     # Spins up docker services, applies migrations, and runs NestJS
pnpm start:dev               # Runs NestJS server locally in watch mode
pnpm lint                    # Lints files and applies style formatting auto-fixes
pnpm format                  # Runs Prettier over all source code
pnpm prisma:generate         # Updates generated Prisma Client database types
pnpm prisma:migrate:deploy   # Applies schema changes to database without prompting
```

---

## Testing Guide

The testing stack includes Unit, Integration, E2E, and coverage gates enforced in CI.

```bash
pnpm test              # Run all test suites
pnpm test:cov          # Run tests and generate code coverage report
pnpm test:integration  # Run database repository integration tests
pnpm test:e2e          # Run HTTP contract end-to-end tests
```

### Coverage Quality Gates
Code coverage is strictly enforced with these global gates:
- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 85%
- **Lines**: 85%

---

## API Documentation & Examples

### 1. Create a Purchase
Stores a purchase transaction denominated in USD.

- **HTTP Request**: `POST /purchase`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your-access-token>`
- **Body**:
```json
{
  "description": "Premium office chair",
  "transactionDate": "2026-05-27",
  "purchaseAmountUsd": "349.99"
}
```
- **Response (201 Created)**:
```json
{
  "id": "24982a7f-7128-4ad0-bb2a-fa1372b64703",
  "description": "Premium office chair",
  "transactionDate": "2026-05-27",
  "purchaseAmountUsd": "349.99"
}
```

### 2. Retrieve Converted Purchase
Retrieves a purchase transaction and converts its USD value to the target currency.

- **HTTP Request**: `GET /purchase/{id}?targetCurrency={currencyCode}`
- **Headers**:
  - `Authorization: Bearer <your-access-token>`
- **Request Parameters**:
  - `id`: The UUID of the purchase (Path parameter).
  - `targetCurrency`: The 3-character ISO 4217 code (Query parameter, e.g., `EUR`, `BRL`, `CAD`).
- **Example**: `GET http://localhost:3000/purchase/24982a7f-7128-4ad0-bb2a-fa1372b64703?targetCurrency=EUR`
- **Response (200 OK)**:
```json
{
  "id": "24982a7f-7128-4ad0-bb2a-fa1372b64703",
  "description": "Premium office chair",
  "transactionDate": "2026-05-27",
  "purchaseAmountUsd": "349.99",
  "targetCurrency": "EUR",
  "exchangeRate": "0.9200",
  "convertedAmount": "321.99"
}
```

---

## Future Roadmap: Idempotency Strategy

While the database repository provides an `upsert` mechanism, full end-to-end HTTP idempotency is not yet active at the API gateway layer. Below is the proposed blueprint for future implementation:

1. **Idempotency Header**:
   - Clients will provide an `Idempotency-Key` UUID-v4 header when calling mutating operations (such as `POST /purchase`).
2. **NestJS Middleware**:
   - A global or router-bound NestJS interceptor will intercept incoming POST requests with an `Idempotency-Key`.
   - It will check a fast-access cache (e.g. Redis) or database lock table to see if that key has been processed before.
3. **Behavior**:
   - **In Progress**: If the same key is received while the original request is still processing, the API returns `409 Conflict`.
   - **Processed**: If the key has completed execution, the interceptor bypasses the controller and replies directly with the cached payload and a custom `X-Cache-Idempotency: true` header.
   - **Unseen**: If the key is new, the request executes normally, and the final response payload is persisted in the cache/database locked to that idempotency key.
