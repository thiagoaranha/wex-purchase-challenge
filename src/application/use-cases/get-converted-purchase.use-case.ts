import { Purchase } from '../../domain/entities/purchase';
import { CurrencyCode } from '../../domain/value-objects/currency-code';
import { ExchangeRate } from '../../domain/value-objects/exchange-rate';
import {
  GetConvertedPurchaseInputDto,
  GetConvertedPurchaseOutputDto,
} from '../dtos/get-converted-purchase.dto';
import {
  NoValidExchangeRateError,
  UnsupportedExchangeRateCurrencyError,
} from '../errors/exchange-rate-conversion.error';
import { PurchaseNotFoundError } from '../errors/purchase-not-found.error';
import { Clock } from '../interfaces/clock';
import {
  ExchangeRateProvider,
  ExchangeRateQuote,
} from '../interfaces/exchange-rate-provider';
import { PurchaseRepository } from '../interfaces/purchase-repository';

export class GetConvertedPurchaseUseCase {
  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly exchangeRateProvider: ExchangeRateProvider,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: GetConvertedPurchaseInputDto,
  ): Promise<GetConvertedPurchaseOutputDto> {
    void this.clock.now();

    const purchase = await this.findPurchase(input.purchaseId);
    const targetCurrency = CurrencyCode.create(input.targetCurrency);
    const exchangeRateQuote = await this.selectExchangeRate(
      purchase.transactionDate.value,
      targetCurrency.value,
    );
    const exchangeRate = ExchangeRate.create(exchangeRateQuote.rate);
    const convertedAmount = purchase.convertTo(targetCurrency, exchangeRate);

    return {
      id: purchase.id.value,
      description: purchase.description.value,
      transactionDate: purchase.transactionDate.value,
      purchaseAmountUsd: purchase.purchaseAmountUsd.toDecimalString(),
      targetCurrency: targetCurrency.value,
      exchangeRate: exchangeRate.toDecimalString(),
      convertedAmount: convertedAmount.toDecimalString(),
    };
  }

  private async findPurchase(purchaseId: string): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findById(purchaseId);

    if (!purchase) {
      throw new PurchaseNotFoundError(purchaseId);
    }

    return purchase;
  }

  private async selectExchangeRate(
    purchaseDate: string,
    targetCurrency: string,
  ): Promise<ExchangeRateQuote> {
    if (!this.exchangeRateProvider.supportsCurrency(targetCurrency)) {
      throw new UnsupportedExchangeRateCurrencyError(targetCurrency);
    }

    const validRates = (await this.exchangeRateProvider.getRates(targetCurrency))
      .filter(
        (rate) =>
          rate.currency.toUpperCase() === targetCurrency &&
          this.isWithinSelectionWindow(rate.date, purchaseDate),
      )
      .sort((left, right) => right.date.localeCompare(left.date));

    const exchangeRate = validRates[0];

    if (!exchangeRate) {
      throw new NoValidExchangeRateError(targetCurrency, purchaseDate);
    }

    return exchangeRate;
  }

  private isWithinSelectionWindow(
    rateDate: string,
    purchaseDate: string,
  ): boolean {
    return (
      rateDate <= purchaseDate &&
      rateDate >= this.subtractMonths(purchaseDate, 6)
    );
  }

  private subtractMonths(isoDate: string, months: number): string {
    const [yearText, monthText, dayText] = isoDate.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1 - months;
    const day = Number(dayText);
    const anchor = new Date(Date.UTC(year, monthIndex, 1));
    const maxDay = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const clampedDay = Math.min(day, maxDay);

    return this.formatIsoDate(
      new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), clampedDay),
      ),
    );
  }

  private formatIsoDate(date: Date): string {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
