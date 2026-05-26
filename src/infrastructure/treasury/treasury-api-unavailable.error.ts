export class TreasuryApiUnavailableError extends Error {
  readonly code = 'TREASURY_API_UNAVAILABLE';

  constructor(cause?: unknown) {
    super('Treasury Fiscal Data API is currently unavailable. Please try again later.');
    this.name = 'TreasuryApiUnavailableError';
    this.cause = cause;
    Object.setPrototypeOf(this, TreasuryApiUnavailableError.prototype);
  }
}
