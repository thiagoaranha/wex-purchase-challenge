import { randomUUID } from 'node:crypto';
import { InvalidPurchaseIdError } from '../errors/purchase-domain-errors';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PurchaseId {
  private constructor(private readonly value_: string) {}

  static create(value?: string): PurchaseId {
    if (value === undefined) {
      return new PurchaseId(randomUUID());
    }

    const normalized = value.trim();

    if (!UUID_PATTERN.test(normalized)) {
      throw new InvalidPurchaseIdError(value);
    }

    return new PurchaseId(normalized.toLowerCase());
  }

  get value(): string {
    return this.value_;
  }

  equals(other: PurchaseId): boolean {
    return this.value_ === other.value_;
  }

  toString(): string {
    return this.value_;
  }
}
