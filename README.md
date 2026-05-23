# WEX Purchase Currency Conversion API

API for storing purchase transactions in United States dollars and retrieving those purchases converted to currencies supported by the Treasury Reporting Rates of Exchange API.

This project is planned as a production-oriented backend service using DDD, automated tests, PostgreSQL persistence, CI validation, and secure defaults.

## Requirements Covered

- Store a purchase transaction with:
  - description;
  - transaction date;
  - purchase amount in USD;
  - unique identifier.
- Validate:
  - description length up to 50 characters;
  - valid transaction date;
  - positive purchase amount rounded to cents.
- Retrieve a stored purchase converted to a target currency.
- Use the exchange rate active on or before the purchase date.
- Reject conversion when no valid exchange rate exists within 6 months before the purchase date.
- Round converted amounts to two decimal places.

## Planned Tech Stack

- Runtime: Node.js 20+
- Package manager: pnpm
- Language: TypeScript
- Framework: NestJS
- Architecture: DDD + Hexagonal Architecture
- Database: PostgreSQL
- ORM: Prisma
- Logging: Pino
- Tests: Jest
- Local infrastructure: Docker Compose
- CI: GitHub Actions

## Architecture Overview

The codebase should keep business rules isolated from framework and infrastructure details.

Planned structure:

```text
src/
  domain/
  application/
  infrastructure/
  interfaces/
    http/
  shared/
```

Core rules should live in `domain` and `application`. NestJS controllers, Prisma repositories, Treasury API clients, logging, and configuration should be implemented as adapters.

## Prerequisites

- Node.js 20 or newer
- pnpm
- Docker and Docker Compose
- Git

Install pnpm if needed:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Environment Variables

Create a `.env` file based on `.env.example` once the project scaffold is available.

Expected variables:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://wex_user:wex_password@localhost:5432/wex_db?schema=public
TREASURY_API_BASE_URL=https://api.fiscaldata.treasury.gov/services/api/fiscal_service
```

Additional variables may be introduced as security, observability, and deployment features are implemented.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start local infrastructure:

```bash
docker compose up -d
```

Generate Prisma client:

```bash
pnpm prisma generate
```

Run database migrations:

```bash
pnpm prisma migrate deploy
```

Start the API in development mode:

```bash
pnpm dev
```

## Planned Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:cov
pnpm test:e2e
pnpm prisma generate
pnpm prisma migrate deploy
```

## API Endpoints

### Create Purchase

```http
POST /purchases
Content-Type: application/json
Idempotency-Key: <uuid-v4>
```

Request body:

```json
{
  "description": "Office supplies",
  "transactionDate": "2026-05-23",
  "purchaseAmount": "125.49"
}
```

Expected response:

```json
{
  "id": "8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1",
  "description": "Office supplies",
  "transactionDate": "2026-05-23",
  "purchaseAmountUsd": "125.49"
}
```

### Retrieve Converted Purchase

```http
GET /purchases/{id}/conversions/{currency}
```

Expected response:

```json
{
  "id": "8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1",
  "description": "Office supplies",
  "transactionDate": "2026-05-23",
  "purchaseAmountUsd": "125.49",
  "targetCurrency": "EUR",
  "exchangeRate": "0.9200",
  "convertedAmount": "115.45"
}
```

## Testing Strategy

The project should use a layered testing strategy:

- Unit tests for domain value objects, entities, and business rules.
- Unit tests for application use cases with mocked ports.
- Integration tests for Prisma repositories using PostgreSQL.
- E2E tests for HTTP contracts.
- Fixture-based tests for Treasury API integration.

Coverage gates should be enforced by CI:

- Statements: 85%
- Branches: 80%
- Functions: 85%
- Lines: 85%

Run tests:

```bash
pnpm test
pnpm test:cov
pnpm test:e2e
```

## CI

GitHub Actions should validate every pull request and push to `main`.

The pipeline should run:

- dependency installation with pnpm;
- lint;
- TypeScript build;
- Prisma generate;
- Prisma migrations against a temporary PostgreSQL service;
- unit tests;
- integration/e2e tests;
- coverage validation.

## Quality Bar

Before merging a pull request:

- TypeScript must compile successfully.
- Lint must pass.
- Tests must pass.
- Coverage thresholds must be met.
- Database migrations must be versioned.
- No secrets may be committed.
- Pull request must pass CI.
