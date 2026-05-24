import { PurchaseAmountMustBeUsdError } from '../errors/purchase-domain-errors';
import { CurrencyCode } from '../value-objects/currency-code';
import { Description } from '../value-objects/description';
import { ExchangeRate } from '../value-objects/exchange-rate';
import { Money } from '../value-objects/money';
import { PurchaseId } from '../value-objects/purchase-id';
import { TransactionDate } from '../value-objects/transaction-date';

export interface PurchaseCreateProps {
  id?: PurchaseId;
  description: Description;
  transactionDate: TransactionDate;
  purchaseAmountUsd: Money;
}

export class Purchase {
  private constructor(
    private readonly id_: PurchaseId,
    private readonly description_: Description,
    private readonly transactionDate_: TransactionDate,
    private readonly purchaseAmountUsd_: Money,
  ) {}

  static create(props: PurchaseCreateProps): Purchase {
    if (!props.purchaseAmountUsd.currency.equals(CurrencyCode.usd())) {
      throw new PurchaseAmountMustBeUsdError(
        props.purchaseAmountUsd.currency.value,
      );
    }

    return new Purchase(
      props.id ?? PurchaseId.create(),
      props.description,
      props.transactionDate,
      props.purchaseAmountUsd,
    );
  }

  get id(): PurchaseId {
    return this.id_;
  }

  get description(): Description {
    return this.description_;
  }

  get transactionDate(): TransactionDate {
    return this.transactionDate_;
  }

  get purchaseAmountUsd(): Money {
    return this.purchaseAmountUsd_;
  }

  convertTo(targetCurrency: CurrencyCode, exchangeRate: ExchangeRate): Money {
    return this.purchaseAmountUsd_.convert(exchangeRate, targetCurrency);
  }
}
