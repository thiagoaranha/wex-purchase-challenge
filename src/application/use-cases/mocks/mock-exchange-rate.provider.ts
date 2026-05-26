import { Injectable } from '@nestjs/common';
import {
  ExchangeRateProvider,
  ExchangeRateQuote,
} from '../../interfaces/exchange-rate-provider';

@Injectable()
export class MockExchangeRateProvider implements ExchangeRateProvider {
  supportsCurrency(currency: string): boolean {
    return currency.toUpperCase() === 'BRL' || currency.toUpperCase() === 'EUR' || currency.toUpperCase() === 'USD';
  }

  getRates(currency: string): ExchangeRateQuote[] {
    const baseRates: Record<string, string> = { BRL: '5.20', EUR: '0.90', USD: '1.00' };
    const rate = baseRates[currency.toUpperCase()];
    if (!rate) return [];

    return Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        currency: currency.toUpperCase(),
        date: date.toISOString().slice(0, 10),
        rate,
      };
    });
  }
}
