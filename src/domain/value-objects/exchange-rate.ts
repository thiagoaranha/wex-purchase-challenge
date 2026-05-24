import { InvalidExchangeRateError } from '../errors/purchase-domain-errors';

const SCALE = 4;
const SCALE_FACTOR = 10_000n;

function parseDecimalToScaledInteger(value: string, scale: number): bigint {
  const normalized = value.trim();

  if (!normalized) {
    throw new InvalidExchangeRateError('required', value);
  }

  const onlyNumbersPattern = /^[+-]?\d+(?:\.\d+)?$/;
  if (!onlyNumbersPattern.test(normalized)) {
    throw new InvalidExchangeRateError('invalid_number', value);
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

  return scaled;
}

function formatScaledInteger(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absoluteValue = negative ? -value : value;
  const factor = 10n ** BigInt(scale);
  const wholePart = absoluteValue / factor;
  const fractionPart = absoluteValue % factor;
  const fraction = fractionPart.toString().padStart(scale, '0');

  return `${negative ? '-' : ''}${wholePart.toString()}.${fraction}`;
}

export class ExchangeRate {
  private constructor(private readonly value_: bigint) { }

  static create(value: string | number | bigint): ExchangeRate {
    if (value === undefined || value === null) {
      throw new InvalidExchangeRateError('required', String(value));
    }

    const valueAsString =
      typeof value === 'bigint' ? value.toString() : String(value);
    const scaled = parseDecimalToScaledInteger(valueAsString, SCALE);

    if (scaled <= 0n) {
      throw new InvalidExchangeRateError(
        'non_positive',
        formatScaledInteger(scaled, SCALE),
      );
    }

    return new ExchangeRate(scaled);
  }

  get value(): string {
    return formatScaledInteger(this.value_, SCALE);
  }

  toDecimalString(): string {
    return formatScaledInteger(this.value_, SCALE);
  }

  toScaledInteger(): bigint {
    return this.value_;
  }

  scaleFactor(): bigint {
    return SCALE_FACTOR;
  }

  equals(other: ExchangeRate): boolean {
    return this.value_ === other.value_;
  }

  toString(): string {
    return this.toDecimalString();
  }
}
