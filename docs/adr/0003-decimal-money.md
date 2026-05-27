# ADR 0003: Fixed-Point Currency Math using BigInt

## Status
Accepted

## Context
Financial systems must avoid floating-point arithmetic (IEEE 754 float/double types) due to rounding inaccuracies (e.g., `0.1 + 0.2 // returns 0.30000000000000004`). We require precise, predictable currency representation and calculation for purchase amounts (USD) and converted amounts (other currencies), as well as rates (scale of 4).

## Decision
We implemented custom domain value objects, **`Money`** and **`ExchangeRate`**, using native **`bigint`** internally to execute fixed-point calculations instead of importing external library wrappers like `decimal.js`.

Key implementation details:
- **`Money` Scale**: An amount is stored as `amountInCents` (a scale of 2). For example, `$123.45` is stored internally as `12345n`.
- **`ExchangeRate` Scale**: Rates are parsed and represented with a scale of 4 (e.g., rate `0.9200` is represented as `9200n` with a scale factor of `10000n`).
- **Rounding Logic**: Conversions apply a custom `roundScaledDivision` method using round-half-up logic on the scaled integers (e.g., `(amountInCents * scaledRate) / scaleFactor`).
- **Persistence Mapping**: PostgreSQL stores the amount as a `Decimal(18, 2)` column. In the infrastructure layer (`PrismaPurchaseRepository`), Prisma's `Decimal` type is used to translate between the database's string-based decimal representation and the domain's type-safe `Money` value object.

## Consequences
- **Zero Floating-Point Drift**: All currency operations are mathematically precise, satisfying financial auditing requirements.
- **Improved Performance**: Standard operations on native JavaScript `bigint` types avoid the runtime overhead associated with heavy external object allocation or floating-point parsing.
- **Encapsulated Validations**: The `Money` value object encapsulates constraints (e.g., verifying that a purchase is a positive non-zero value and rejecting negative entries) inside the domain layer.
