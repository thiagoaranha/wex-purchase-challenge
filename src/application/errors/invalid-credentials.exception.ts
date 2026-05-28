export class InvalidCredentialsException extends Error {
  constructor() {
    super('Invalid client credentials');
    this.name = 'InvalidCredentialsException';
  }
}
