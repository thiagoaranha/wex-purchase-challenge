import { TransactionDate } from './transaction-date';
import { InvalidTransactionDateError } from '../errors/purchase-domain-errors';

describe('TransactionDate', () => {
  it('should create a valid transaction date', () => {
    const date = TransactionDate.create('2026-05-23');

    expect(date.value).toBe('2026-05-23');
    expect(date.toDate().toISOString()).toBe('2026-05-23T00:00:00.000Z');
  });

  it('should reject invalid date formats', () => {
    expect(() => TransactionDate.create('23-05-2026')).toThrow(
      InvalidTransactionDateError,
    );
    expect(() => TransactionDate.create('2026/05/23')).toThrow(
      InvalidTransactionDateError,
    );
  });

  it('should reject impossible calendar dates', () => {
    expect(() => TransactionDate.create('2026-02-29')).toThrow(
      InvalidTransactionDateError,
    );
  });

  it('should compare dates', () => {
    expect(
      TransactionDate.create('2026-05-23').equals(
        TransactionDate.create('2026-05-23'),
      ),
    ).toBe(true);
  });

  it('should stringify dates', () => {
    expect(TransactionDate.create('2026-05-23').toString()).toBe(
      '2026-05-23',
    );
  });
});
