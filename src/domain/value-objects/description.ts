import { InvalidDescriptionError } from '../errors/purchase-domain-errors';

export class Description {
  static readonly maxLength = 50;

  private constructor(private readonly value_: string) {}

  static create(value: string): Description {
    const normalized = value.trim();

    if (!normalized) {
      throw new InvalidDescriptionError('required', value);
    }

    if (normalized.length > Description.maxLength) {
      throw new InvalidDescriptionError('too_long', normalized);
    }

    return new Description(normalized);
  }

  get value(): string {
    return this.value_;
  }

  equals(other: Description): boolean {
    return this.value_ === other.value_;
  }

  toString(): string {
    return this.value_;
  }
}
