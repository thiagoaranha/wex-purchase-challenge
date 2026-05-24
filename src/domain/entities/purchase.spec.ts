import { Purchase } from './purchase';
import { CurrencyCode } from '../value-objects/currency-code';
import { Description } from '../value-objects/description';
import { ExchangeRate } from '../value-objects/exchange-rate';
import { Money } from '../value-objects/money';
import { PurchaseId } from '../value-objects/purchase-id';
import { TransactionDate } from '../value-objects/transaction-date';
import { PurchaseAmountMustBeUsdError } from '../errors/purchase-domain-errors';

describe('Purchase', () => {
  it('should create a purchase with a generated id when no id is provided', () => {
    const purchase = Purchase.create({
      description: Description.create('Office supplies'),
      transactionDate: TransactionDate.create('2026-05-23'),
      purchaseAmountUsd: Money.create('125.49', CurrencyCode.usd()),
    });

    expect(purchase.id.value).toMatch(/^[0-9a-f-]{36}$/i);
    expect(purchase.description.value).toBe('Office supplies');
    expect(purchase.transactionDate.value).toBe('2026-05-23');
    expect(purchase.purchaseAmountUsd.toDecimalString()).toBe('125.49');
  });

  it('should create a purchase with a provided id', () => {
    const id = PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1');
    const purchase = Purchase.create({
      id,
      description: Description.create('Office supplies'),
      transactionDate: TransactionDate.create('2026-05-23'),
      purchaseAmountUsd: Money.create('125.49', CurrencyCode.usd()),
    });

    expect(purchase.id.equals(id)).toBe(true);
  });

  it('should reject purchase amounts that are not in USD', () => {
    expect(() =>
      Purchase.create({
        description: Description.create('Office supplies'),
        transactionDate: TransactionDate.create('2026-05-23'),
        purchaseAmountUsd: Money.create('125.49', CurrencyCode.create('EUR')),
      }),
    ).toThrow(PurchaseAmountMustBeUsdError);
  });

  it('should convert purchase amounts using an exchange rate', () => {
    const purchase = Purchase.create({
      description: Description.create('Office supplies'),
      transactionDate: TransactionDate.create('2026-05-23'),
      purchaseAmountUsd: Money.create('125.49', CurrencyCode.usd()),
    });

    const converted = purchase.convertTo(
      CurrencyCode.create('EUR'),
      ExchangeRate.create('0.9200'),
    );

    expect(converted.toDecimalString()).toBe('115.45');
    expect(converted.currency.value).toBe('EUR');
  });
});
