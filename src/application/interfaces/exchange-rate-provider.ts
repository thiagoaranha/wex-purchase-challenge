export interface ExchangeRateQuote {
  currency: string;
  date: string;
  rate: string;
}

export interface ExchangeRateProvider {
  supportsCurrency(currency: string): boolean;
  getRates(currency: string): Promise<ExchangeRateQuote[]>;
}
