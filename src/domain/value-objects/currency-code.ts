import { InvalidCurrencyCodeError } from '../errors/purchase-domain-errors';

export class CurrencyCode {
  private constructor(private readonly value_: string) { }

  static create(value: string): CurrencyCode {
    const normalized = value.trim().toUpperCase();
    const onlyThreeLettersPattern = /^[A-Z]{3}$/;

    if (!onlyThreeLettersPattern.test(normalized)) {
      throw new InvalidCurrencyCodeError(value);
    }

    return new CurrencyCode(normalized);
  }

  static usd(): CurrencyCode {
    return new CurrencyCode('USD');
  }

  get value(): string {
    return this.value_;
  }

  equals(other: CurrencyCode): boolean {
    return this.value_ === other.value_;
  }

  toString(): string {
    return this.value_;
  }
}
