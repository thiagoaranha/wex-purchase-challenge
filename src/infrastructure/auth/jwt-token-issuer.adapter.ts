import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenIssuer,
  TokenIssuanceResult,
} from '../../application/interfaces/token-issuer';
import { AppConfig } from '../../shared/config/app-config';

@Injectable()
export class JwtTokenIssuerAdapter implements ITokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  async issue(subject: string): Promise<TokenIssuanceResult> {
    const expiresIn = AppConfig.jwtAccessTokenTtlSeconds;
    const payload = { sub: subject };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    return {
      accessToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }
}
