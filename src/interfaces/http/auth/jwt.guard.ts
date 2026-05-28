import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  TOKEN_VALIDATOR_PORT,
  type ITokenValidator,
} from '../../../application/interfaces/token-validator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { InvalidTokenException } from '../../../infrastructure/auth/invalid-token.exception';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VALIDATOR_PORT)
    private readonly tokenValidator: ITokenValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      const payload = await this.tokenValidator.validate(token);
      // Assign the payload to the request object so it can be accessed
      // in controllers via the @CurrentUser() decorator.
      request['user'] = payload;
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Authentication failed');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
