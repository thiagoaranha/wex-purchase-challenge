# Operations Runbook

This guide covers operational activities, database migrations, health monitoring, and troubleshooting steps for the WEX Purchase Currency Conversion API.

---

## 1. Database Migrations

This project uses **Prisma Migrations** to manage relational schemas. The migrations are located in the `prisma/migrations` directory.

### Running Migrations locally / Development
To apply migrations and update your local database schema, run:
```bash
pnpm prisma migrate dev
```
*Note: This command generates SQL files, updates your database, and auto-generates the local Prisma client.*

### Deploying Migrations in Production / CI
In production or staging environments, never run `migrate dev`. Instead, use `migrate deploy` to apply pending migrations without modifying the history or generating new schema differences:
```bash
pnpm prisma migrate:deploy
```
*(Mapped to `pnpm prisma migrate deploy` in `package.json`)*

### Creating a New Migration
If you modify the `prisma/schema.prisma` file, generate a new migration script using:
```bash
pnpm prisma migrate dev --name <migration_description>
```

---

## 2. Health Monitoring & Checks

The service uses `@nestjs/terminus` for health check reporting. The endpoints are exposed on the primary API port (default: `3000`).

### Liveness Check
Used by orchestrators (e.g. Kubernetes) to determine if the container should be restarted. It returns a static confirmation that the NestJS process is running.
- **Endpoint**: `GET http://localhost:3000/health/live`
- **Response**:
```json
{
  "status": "up",
  "timestamp": "2026-05-27T19:00:00.000Z",
  "app": "wex-purchase-api-node"
}
```

### Readiness Check
Used by load balancers and orchestrators to determine if the application is ready to accept incoming user requests. It verifies backing services (specifically PostgreSQL connectivity).
- **Endpoint**: `GET http://localhost:3000/health/ready`
- **Successful Response (200 OK)**:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
      }
    },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```
- **Failure Response (503 Service Unavailable)**:
```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down",
      "message": "Connection to PostgreSQL failed."
    }
  },
  "details": {
    "database": {
      "status": "down",
      "message": "Connection to PostgreSQL failed."
    }
  }
}
```

---

## 3. Troubleshooting Guide

Below are common issues, their root causes, and verification steps.

### A. Database Connection Issues
- **Symptoms**:
  - `ready` check returns `503 Service Unavailable` with database status `down`.
  - API starts failing with PostgreSQL connection exceptions on startup or request handling.
- **Troubleshooting Steps**:
  1. Ensure the PostgreSQL docker container is up:
     ```bash
     docker compose ps
     ```
  2. If the container is down or stopped, restart the infrastructure:
     ```bash
     docker compose up -d --wait
     ```
  3. Validate the `DATABASE_URL` in your `.env` matches the docker credentials:
     ```env
     DATABASE_URL=postgresql://wex_user:wex_password@localhost:5432/wex_db?schema=public
     ```
  4. Manually verify Prisma connectivity by running:
     ```bash
     pnpm prisma db pull
     ```

### B. Treasury API Failures / Timeouts
- **Symptoms**:
  - Retrieving converted purchases returns a `503 Service Unavailable` error with the message `Exchange Rate Provider is unavailable`.
  - Outgoing Treasury HTTP logs report HTTP `5xx` or `ECONNRESET`/`ETIMEOUT` errors.
- **Troubleshooting Steps**:
  1. Verify the configured `TREASURY_API_BASE_URL` in `.env` is correct and accessible:
     ```env
     TREASURY_API_BASE_URL=https://api.fiscaldata.treasury.gov/services/api/fiscal_service
     ```
  2. Check if the Treasury API service is globally degraded by querying their status page or testing with a direct cURL:
     ```bash
     curl -I "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange"
     ```
  3. Adjust the timeout setting (`TREASURY_API_TIMEOUT_MS`) in `.env` if the Treasury API is slow but functioning.

### C. Out-of-sync Prisma Client
- **Symptoms**:
  - Build failure: `Cannot find module '../generated/prisma/client'` or similar import errors.
- **Troubleshooting Steps**:
  1. Re-generate the local Prisma Client:
     ```bash
     pnpm prisma:generate
     ```
  2. Clean and rebuild the project:
     ```bash
     pnpm build
     ```

---

## 4. Security & CORS Configuration

To protect the API surfaces in production and staging environments, the system restricts Cross-Origin Resource Sharing (CORS) using secure default settings.

### CORS Restrictions
- **Allowed Origins**: Configured via the `CORS_ALLOWED_ORIGINS` environment variable in the `.env` file. Multiple allowed domains can be specified (e.g., `http://localhost:3000` or the production frontend URL).
- **Allowed HTTP Methods**: Strictly restricted to `GET` and `POST` to match the endpoints exposed by the service. All other HTTP methods will be blocked.
- **Allowed HTTP Headers**: Only `Content-Type` and `Accept` are allowed.

### Troubleshooting CORS Errors
If frontends or external consumers report CORS validation errors:
1. Verify that the exact client origin (protocol, host, and port) is listed in the `CORS_ALLOWED_ORIGINS` environment variable.
2. Confirm the client is not using non-standard HTTP methods or requesting custom headers that are blocked by the CORS filter.
