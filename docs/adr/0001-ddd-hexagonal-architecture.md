# ADR 0001: DDD and Hexagonal Architecture

## Status
Accepted

## Context
We need to design a system that stores purchase transactions in USD and retrieves them converted to other currencies using the Treasury Reporting Rates of Exchange API. The business rules (e.g., date verification, amount validation, exchange rate selection windows) must remain isolated from database operations, framework configurations, and external HTTP clients to ensure high maintainability, testability, and adaptability.

## Decision
We adopted **Domain-Driven Design (DDD)** combined with **Hexagonal Architecture (Ports and Adapters)**.

The codebase is organized into four main layers:
1. **Domain (`src/domain`)**: Contains core entities (e.g., `Purchase`), value objects (e.g., `Money`, `ExchangeRate`, `Description`), and domain errors. This layer is entirely independent of external frameworks or databases.
2. **Application (`src/application`)**: Houses the orchestration logic and use cases (e.g., `CreatePurchaseUseCase`, `GetConvertedPurchaseUseCase`). It defines **Ports** (interfaces) for dependency inversion, such as `PurchaseRepository` and `ExchangeRateProvider`.
3. **Infrastructure (`src/infrastructure`)**: Implements the Ports (Adapters) using specific technologies. This contains the Prisma/PostgreSQL repository implementation, the Axios-based Treasury API provider, logging, clocks, and other low-level configurations.
4. **Interfaces (`src/interfaces`)**: Entry points for the application, specifically the HTTP controller layer (NestJS controllers, DTOs, Exception Filters, and Pipes).

## Consequences
- **High Testability**: Domain value objects and application use cases can be fully unit-tested using mocks for their ports, without requiring database connections or spinning up HTTP servers.
- **Strict Decoupling**: If the database changes (e.g., from PostgreSQL to MongoDB) or the framework changes (e.g., from NestJS to Fastify), the core domain logic and application layers remain untouched.
- **Dependency Inversion**: Outer layers (Infrastructure, Interfaces) depend on inner layers (Application, Domain). Inner layers do not reference outer layers.
