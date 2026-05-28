export interface TokenIssuanceResult {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ITokenIssuer {
  issue(subject: string): Promise<TokenIssuanceResult>;
}

export const TOKEN_ISSUER_PORT = Symbol('ITokenIssuer');
