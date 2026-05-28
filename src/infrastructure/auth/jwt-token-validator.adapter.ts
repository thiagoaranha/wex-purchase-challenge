import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenValidator,
  TokenPayload,
} from '../../application/interfaces/token-validator';
import { InvalidTokenException } from './invalid-token.exception';

@Injectable()
export class JwtTokenValidatorAdapter implements ITokenValidator {
  constructor(private readonly jwtService: JwtService) {}

  async validate(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);
      return payload;
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidTokenException(error.message);
      }
      throw new InvalidTokenException();
    }
  }
}
