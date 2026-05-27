import { Purchase } from '../../domain/entities/purchase';
import { CurrencyCode } from '../../domain/value-objects/currency-code';
import { Description } from '../../domain/value-objects/description';
import { Money } from '../../domain/value-objects/money';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { TransactionDate } from '../../domain/value-objects/transaction-date';
import { GetConvertedPurchaseUseCase } from './get-converted-purchase.use-case';
import {
  ExchangeRateProvider,
  ExchangeRateQuote,
} from '../interfaces/exchange-rate-provider';
import { PurchaseRepository } from '../interfaces/purchase-repository';
import {
  NoValidExchangeRateError,
  UnsupportedExchangeRateCurrencyError,
} from '../errors/exchange-rate-conversion.error';
import { PurchaseNotFoundError } from '../errors/purchase-not-found.error';

class FakePurchaseRepository implements PurchaseRepository {
  constructor(private readonly purchases: Purchase[]) {}

  save(): Promise<void> {
    return Promise.resolve();
  }

  findById(id: string): Promise<Purchase | null> {
    return Promise.resolve(
      this.purchases.find((purchase) => purchase.id.value === id) ?? null,
    );
  }
}

class FakeExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly supportedCurrencies: string[],
    private readonly rates: ExchangeRateQuote[],
  ) {}

  supportsCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency);
  }

  getRates(currency: string): Promise<ExchangeRateQuote[]> {
    return Promise.resolve(
      this.rates.filter((rate) => rate.currency === currency),
    );
  }
}

function buildPurchase(): Purchase {
  return Purchase.create({
    id: PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
    description: Description.create('Office supplies'),
    transactionDate: TransactionDate.create('2026-05-23'),
    purchaseAmountUsd: Money.create('125.49', CurrencyCode.usd()),
  });
}

describe('GetConvertedPurchaseUseCase', () => {
  it('should convert using the exact exchange rate date when available', async () => {
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([buildPurchase()]),
      new FakeExchangeRateProvider(
        ['EUR'],
        [
          { currency: 'EUR', date: '2026-05-23', rate: '0.9200' },
          { currency: 'EUR', date: '2026-05-22', rate: '0.9100' },
        ],
      ),
    );

    const result = await useCase.execute({
      purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
      targetCurrency: 'EUR',
    });

    expect(result).toEqual({
      id: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
      description: 'Office supplies',
      transactionDate: '2026-05-23',
      purchaseAmountUsd: '125.49',
      targetCurrency: 'EUR',
      exchangeRate: '0.9200',
      convertedAmount: '115.45',
    });
  });

  it('should convert using the most recent rate before the purchase date', async () => {
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([buildPurchase()]),
      new FakeExchangeRateProvider(
        ['EUR'],
        [
          { currency: 'EUR', date: '2026-05-20', rate: '0.9100' },
          { currency: 'EUR', date: '2026-05-18', rate: '0.9000' },
        ],
      ),
    );

    const result = await useCase.execute({
      purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
      targetCurrency: 'EUR',
    });

    expect(result.exchangeRate).toBe('0.9100');
  });

  it('should reject rates outside the six month window', async () => {
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([buildPurchase()]),
      new FakeExchangeRateProvider(
        ['EUR'],
        [{ currency: 'EUR', date: '2025-11-22', rate: '0.9000' }],
      ),
    );

    await expect(
      useCase.execute({
        purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
        targetCurrency: 'EUR',
      }),
    ).rejects.toThrow(NoValidExchangeRateError);
  });

  it('should reject conversions when no rate exists', async () => {
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([buildPurchase()]),
      new FakeExchangeRateProvider(['EUR'], []),
    );

    await expect(
      useCase.execute({
        purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
        targetCurrency: 'EUR',
      }),
    ).rejects.toThrow(NoValidExchangeRateError);
  });

  it('should reject unsupported currencies', async () => {
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([buildPurchase()]),
      new FakeExchangeRateProvider(['USD'], []),
    );

    await expect(
      useCase.execute({
        purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
        targetCurrency: 'EUR',
      }),
    ).rejects.toThrow(UnsupportedExchangeRateCurrencyError);
  });

  it('should reject unknown purchases', async () => {
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([]),
      new FakeExchangeRateProvider(['EUR'], []),
    );

    await expect(
      useCase.execute({
        purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
        targetCurrency: 'EUR',
      }),
    ).rejects.toThrow(PurchaseNotFoundError);
  });

  it('should round converted values to two decimals', async () => {
    const purchase = Purchase.create({
      id: PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
      description: Description.create('Office supplies'),
      transactionDate: TransactionDate.create('2026-05-23'),
      purchaseAmountUsd: Money.create('1', CurrencyCode.usd()),
    });
    const useCase = new GetConvertedPurchaseUseCase(
      new FakePurchaseRepository([purchase]),
      new FakeExchangeRateProvider(
        ['EUR'],
        [{ currency: 'EUR', date: '2026-05-23', rate: '0.0050' }],
      ),
    );

    const result = await useCase.execute({
      purchaseId: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
      targetCurrency: 'EUR',
    });

    expect(result.convertedAmount).toBe('0.01');
  });
});
