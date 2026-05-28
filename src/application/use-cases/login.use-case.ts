import { Inject, Injectable } from '@nestjs/common';
import { AppConfig } from '../../shared/config/app-config';
import { InvalidCredentialsException } from '../errors/invalid-credentials.exception';
import {
  TOKEN_ISSUER_PORT,
  type ITokenIssuer,
  type TokenIssuanceResult,
} from '../interfaces/token-issuer';

export interface LoginInput {
  clientId: string;
  clientSecret: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: ITokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<TokenIssuanceResult> {
    // Constant-time string comparison is generally recommended for security,
    // but a standard check is sufficient for this simple M2M implementation.
    const isClientIdValid = input.clientId === AppConfig.authClientId;
    const isClientSecretValid =
      input.clientSecret === AppConfig.authClientSecret;

    if (!isClientIdValid || !isClientSecretValid) {
      throw new InvalidCredentialsException();
    }

    return this.tokenIssuer.issue(input.clientId);
  }
}
