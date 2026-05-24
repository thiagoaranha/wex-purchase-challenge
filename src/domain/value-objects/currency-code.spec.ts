import { CurrencyCode } from './currency-code';
import { InvalidCurrencyCodeError } from '../errors/purchase-domain-errors';

describe('CurrencyCode', () => {
  it('should create a normalized currency code', () => {
    const currency = CurrencyCode.create(' usd ');

    expect(currency.value).toBe('USD');
    expect(currency.toString()).toBe('USD');
  });

  it('should support usd helper', () => {
    expect(CurrencyCode.usd().value).toBe('USD');
  });

  it('should reject invalid currency codes', () => {
    expect(() => CurrencyCode.create('US')).toThrow(InvalidCurrencyCodeError);
    expect(() => CurrencyCode.create('US1')).toThrow(InvalidCurrencyCodeError);
    expect(() => CurrencyCode.create('EURO')).toThrow(InvalidCurrencyCodeError);
  });

  it('should compare currency codes', () => {
    expect(CurrencyCode.create('usd').equals(CurrencyCode.usd())).toBe(true);
  });
});
