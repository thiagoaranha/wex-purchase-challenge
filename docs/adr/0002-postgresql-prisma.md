# ADR 0002: PostgreSQL and Prisma ORM

## Status
Accepted

## Context
We need a robust, transactional persistence mechanism to store purchase transactions. The persistence layer must support relational schema definitions, reliable transactions (ACID guarantees), and provide type safety when writing query logic within a TypeScript application.

## Decision
We chose **PostgreSQL** as the primary relational database and **Prisma ORM** for database access, schema definition, and migration management.

Key aspects of this decision:
- **Relational Integrity**: PostgreSQL is a mature, ACID-compliant database that perfectly handles financial transaction records where consistency is paramount.
- **Type-Safe Queries**: Prisma automatically generates TypeScript clients based on the `schema.prisma` file, reducing runtime query errors and streamlining development.
- **Declarative Schema**: The database structure is declared in a single `schema.prisma` file, which is easy to read, version control, and maintain.
- **Migration Tracking**: Prisma Migrations track schema evolutions chronologically via SQL scripts under the `prisma/migrations` directory, ensuring consistent database setups across local, CI, staging, and production environments.

## Consequences
- The database schema is fully defined in code (`prisma/schema.prisma`), mapped directly to database tables (e.g. `purchases`).
- Prisma Client is auto-generated inside `src/generated/prisma` during build or setup, avoiding global dependency clutter.
- Relational types are fully integrated into our infrastructure repository (`PrismaPurchaseRepository`), enabling compiler-checked database writes.
