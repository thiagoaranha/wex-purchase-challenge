import { CurrencyCode } from './currency-code';
import { ExchangeRate } from './exchange-rate';
import { Money } from './money';
import { InvalidMoneyError } from '../errors/purchase-domain-errors';

describe('Money', () => {
  it('should create a positive amount rounded to cents', () => {
    const money = Money.create('125.494', CurrencyCode.usd());

    expect(money.amountInCents).toBe(12549n);
    expect(money.toDecimalString()).toBe('125.49');
    expect(money.toString()).toBe('USD 125.49');
  });

  it('should round half up to the nearest cent', () => {
    const money = Money.create('125.495', CurrencyCode.usd());

    expect(money.amountInCents).toBe(12550n);
    expect(money.toDecimalString()).toBe('125.50');
  });

  it('should reject invalid, zero, and negative amounts', () => {
    expect(() => Money.create(undefined as unknown as string, CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
    expect(() => Money.create(null as unknown as string, CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
    expect(() => Money.create('   ', CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
    expect(() => Money.create('0', CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
    expect(() => Money.create('-1', CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
    expect(() => Money.create('abc', CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
  });

  it('should create money from cents', () => {
    const money = Money.fromCents(12345n, CurrencyCode.usd());

    expect(money.amountInCents).toBe(12345n);
    expect(money.toDecimalString()).toBe('123.45');
  });

  it('should reject non-positive cents values', () => {
    expect(() => Money.fromCents(0n, CurrencyCode.usd())).toThrow(
      InvalidMoneyError,
    );
  });

  it('should convert money using an exchange rate and round the result to cents', () => {
    const money = Money.create('125.49', CurrencyCode.usd());
    const converted = money.convert(
      ExchangeRate.create('0.9200'),
      CurrencyCode.create('EUR'),
    );

    expect(converted.currency.value).toBe('EUR');
    expect(converted.toDecimalString()).toBe('115.45');
  });

  it('should round converted values up when the remainder is at least half a cent', () => {
    const money = Money.create('1', CurrencyCode.usd());
    const converted = money.convert(
      ExchangeRate.create('0.0050'),
      CurrencyCode.create('EUR'),
    );

    expect(converted.toDecimalString()).toBe('0.01');
  });

  it('should compare money values', () => {
    expect(
      Money.create('10', CurrencyCode.usd()).equals(
        Money.create('10.00', CurrencyCode.usd()),
      ),
    ).toBe(true);
  });

  it('should stringify money', () => {
    expect(Money.create('10', CurrencyCode.usd()).toString()).toBe('USD 10.00');
  });
});
