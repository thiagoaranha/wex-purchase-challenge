export interface TokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export interface ITokenValidator {
  validate(token: string): Promise<TokenPayload>;
}

export const TOKEN_VALIDATOR_PORT = Symbol('ITokenValidator');
