import { CurrencyCode } from './currency-code';
import { ExchangeRate } from './exchange-rate';
import { InvalidMoneyError } from '../errors/purchase-domain-errors';

function parseDecimalToScaledInteger(
  value: string,
  scale: number,
): { scaled: bigint; roundedValue: string } {
  const normalized = value.trim();

  if (!normalized) {
    throw new InvalidMoneyError('required', value);
  }

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new InvalidMoneyError('invalid_number', value);
  }

  const negative = normalized.startsWith('-');
  const unsigned = normalized.replace(/^[+-]/, '');
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const paddedFraction = `${fractionPart}${'0'.repeat(scale + 1)}`;
  const baseFraction = paddedFraction.slice(0, scale);
  const roundingDigit = Number(paddedFraction.charAt(scale));

  let scaled =
    BigInt(wholePart) * 10n ** BigInt(scale) + BigInt(baseFraction || '0');

  if (roundingDigit >= 5) {
    scaled += 1n;
  }

  if (negative) {
    scaled = -scaled;
  }

  const roundedValue = formatScaledInteger(scaled, scale);

  return { scaled, roundedValue };
}

function formatScaledInteger(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absoluteValue = negative ? -value : value;
  const factor = 10n ** BigInt(scale);
  const wholePart = absoluteValue / factor;
  const fractionPart = absoluteValue % factor;
  const fraction = fractionPart.toString().padStart(scale, '0');

  return `${negative ? '-' : ''}${wholePart.toString()}${scale > 0 ? `.${fraction}` : ''}`;
}

function roundScaledDivision(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;

  if (remainder * 2n >= denominator) {
    return quotient + 1n;
  }

  return quotient;
}

export class Money {
  private constructor(
    private readonly amountInCents_: bigint,
    private readonly currency_: CurrencyCode,
  ) {}

  static create(
    amount: string | number | bigint,
    currency: CurrencyCode,
  ): Money {
    if (amount === undefined || amount === null) {
      throw new InvalidMoneyError('required', String(amount));
    }

    const amountAsString =
      typeof amount === 'bigint' ? amount.toString() : String(amount);
    const { scaled, roundedValue } = parseDecimalToScaledInteger(
      amountAsString,
      2,
    );

    if (scaled <= 0n) {
      throw new InvalidMoneyError('non_positive', roundedValue);
    }

    return new Money(scaled, currency);
  }

  static fromCents(amountInCents: bigint, currency: CurrencyCode): Money {
    if (amountInCents <= 0n) {
      throw new InvalidMoneyError(
        'non_positive',
        formatScaledInteger(amountInCents, 2),
      );
    }

    return new Money(amountInCents, currency);
  }

  get amountInCents(): bigint {
    return this.amountInCents_;
  }

  get currency(): CurrencyCode {
    return this.currency_;
  }

  toDecimalString(): string {
    return formatScaledInteger(this.amountInCents_, 2);
  }

  convert(exchangeRate: ExchangeRate, targetCurrency: CurrencyCode): Money {
    const numerator = this.amountInCents_ * exchangeRate.toScaledInteger();
    const convertedCents = roundScaledDivision(
      numerator,
      exchangeRate.scaleFactor(),
    );

    return Money.fromCents(convertedCents, targetCurrency);
  }

  equals(other: Money): boolean {
    return (
      this.amountInCents_ === other.amountInCents_ &&
      this.currency_.equals(other.currency_)
    );
  }

  toString(): string {
    return `${this.currency_.value} ${this.toDecimalString()}`;
  }
}
