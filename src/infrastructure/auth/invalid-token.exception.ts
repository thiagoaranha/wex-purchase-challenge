export class InvalidTokenException extends Error {
  constructor(reason?: string) {
    super(reason ?? 'Invalid or expired token');
    this.name = 'InvalidTokenException';
  }
}
