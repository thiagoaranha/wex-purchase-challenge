import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../../../application/interfaces/token-validator';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: TokenPayload }>();
    return request.user;
  },
);
