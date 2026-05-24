import { DomainError } from './domain-error';

export class InvalidPurchaseIdError extends DomainError {
  readonly code = 'INVALID_PURCHASE_ID';

  constructor(value: string) {
    super(`Purchase id must be a valid UUID. Received: ${value}`);
  }
}

export class InvalidDescriptionError extends DomainError {
  readonly code = 'INVALID_DESCRIPTION';

  constructor(reason: 'required' | 'too_long', value: string) {
    const message =
      reason === 'required'
        ? 'Purchase description is required.'
        : `Purchase description must have at most 50 characters. Received length: ${value.length}.`;

    super(message);
  }
}

export class InvalidTransactionDateError extends DomainError {
  readonly code = 'INVALID_TRANSACTION_DATE';

  constructor(value: string) {
    super(
      `Transaction date must be a valid calendar date in YYYY-MM-DD format. Received: ${value}`,
    );
  }
}

export class InvalidMoneyError extends DomainError {
  readonly code = 'INVALID_MONEY';

  constructor(
    reason: 'required' | 'non_positive' | 'invalid_number',
    value: string,
  ) {
    const message =
      reason === 'required'
        ? 'Money amount is required.'
        : reason === 'non_positive'
          ? 'Money amount must be positive.'
          : `Money amount must be a valid decimal number. Received: ${value}`;

    super(message);
  }
}

export class InvalidCurrencyCodeError extends DomainError {
  readonly code = 'INVALID_CURRENCY_CODE';

  constructor(value: string) {
    super(
      `Currency code must contain exactly 3 alphabetic characters. Received: ${value}`,
    );
  }
}

export class InvalidExchangeRateError extends DomainError {
  readonly code = 'INVALID_EXCHANGE_RATE';

  constructor(
    reason: 'required' | 'non_positive' | 'invalid_number',
    value: string,
  ) {
    const message =
      reason === 'required'
        ? 'Exchange rate is required.'
        : reason === 'non_positive'
          ? 'Exchange rate must be positive.'
          : `Exchange rate must be a valid decimal number. Received: ${value}`;

    super(message);
  }
}

export class PurchaseAmountMustBeUsdError extends DomainError {
  readonly code = 'PURCHASE_AMOUNT_MUST_BE_USD';

  constructor(currencyCode: string) {
    super(
      `Purchase amount must be denominated in USD. Received: ${currencyCode}`,
    );
  }
}
