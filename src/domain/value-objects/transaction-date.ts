import { InvalidTransactionDateError } from '../errors/purchase-domain-errors';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class TransactionDate {
  private constructor(private readonly value_: string) {}

  static create(value: string): TransactionDate {
    const normalized = value.trim();

    if (!ISO_DATE_PATTERN.test(normalized)) {
      throw new InvalidTransactionDateError(value);
    }

    const [yearText, monthText, dayText] = normalized.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new InvalidTransactionDateError(value);
    }

    return new TransactionDate(normalized);
  }

  get value(): string {
    return this.value_;
  }

  toDate(): Date {
    return new Date(`${this.value_}T00:00:00.000Z`);
  }

  equals(other: TransactionDate): boolean {
    return this.value_ === other.value_;
  }

  toString(): string {
    return this.value_;
  }
}
