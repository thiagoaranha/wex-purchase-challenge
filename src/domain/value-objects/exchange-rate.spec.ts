import { ExchangeRate } from './exchange-rate';
import { InvalidExchangeRateError } from '../errors/purchase-domain-errors';

describe('ExchangeRate', () => {
  it('should create a positive exchange rate rounded to four decimals', () => {
    const rate = ExchangeRate.create('0.92004');

    expect(rate.value).toBe('0.9200');
    expect(rate.toDecimalString()).toBe('0.9200');
  });

  it('should round half up at the fourth decimal place', () => {
    const rate = ExchangeRate.create('0.92005');

    expect(rate.value).toBe('0.9201');
  });

  it('should reject invalid exchange rates', () => {
    expect(() => ExchangeRate.create(undefined as unknown as string)).toThrow(
      InvalidExchangeRateError,
    );
    expect(() => ExchangeRate.create(null as unknown as string)).toThrow(
      InvalidExchangeRateError,
    );
    expect(() => ExchangeRate.create('   ')).toThrow(InvalidExchangeRateError);
    expect(() => ExchangeRate.create('0')).toThrow(InvalidExchangeRateError);
    expect(() => ExchangeRate.create('-1')).toThrow(InvalidExchangeRateError);
    expect(() => ExchangeRate.create('abc')).toThrow(InvalidExchangeRateError);
  });

  it('should compare exchange rates', () => {
    expect(
      ExchangeRate.create('0.9200').equals(ExchangeRate.create('0.92000')),
    ).toBe(true);
  });

  it('should stringify exchange rates', () => {
    expect(ExchangeRate.create('0.9200').toString()).toBe('0.9200');
  });
});
