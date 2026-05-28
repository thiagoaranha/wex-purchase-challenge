import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../shared/config/app-config';
import { TOKEN_VALIDATOR_PORT } from '../application/interfaces/token-validator';
import { TOKEN_ISSUER_PORT } from '../application/interfaces/token-issuer';
import { JwtTokenValidatorAdapter } from '../infrastructure/auth/jwt-token-validator.adapter';
import { JwtTokenIssuerAdapter } from '../infrastructure/auth/jwt-token-issuer.adapter';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { AuthController } from '../interfaces/http/auth/auth.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: AppConfig.jwtSecret,
      signOptions: { expiresIn: AppConfig.jwtAccessTokenTtlSeconds },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    { provide: TOKEN_VALIDATOR_PORT, useClass: JwtTokenValidatorAdapter },
    { provide: TOKEN_ISSUER_PORT, useClass: JwtTokenIssuerAdapter },
  ],
  exports: [TOKEN_VALIDATOR_PORT, JwtModule],
})
export class AuthModule {}
