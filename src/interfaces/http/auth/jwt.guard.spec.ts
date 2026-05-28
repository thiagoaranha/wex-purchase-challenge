import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtGuard } from './jwt.guard';
import {
  TOKEN_VALIDATOR_PORT,
  ITokenValidator,
} from '../../../application/interfaces/token-validator';
import { InvalidTokenException } from '../../../infrastructure/auth/invalid-token.exception';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let reflector: jest.Mocked<Reflector>;
  let tokenValidator: jest.Mocked<ITokenValidator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: TOKEN_VALIDATOR_PORT,
          useValue: {
            validate: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtGuard>(JwtGuard);
    reflector = module.get(Reflector);
    tokenValidator = module.get(TOKEN_VALIDATOR_PORT);
  });

  const mockExecutionContext = (
    authorizationHeader?: string,
  ): ExecutionContext => {
    const request = {
      headers: {
        authorization: authorizationHeader,
      },
    } as unknown as Request;
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access to public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokenValidator.validate).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if Authorization header is malformed', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('Basic abcdef');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return true and assign user to request if token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('Bearer valid.token.here');
    const payload = { sub: 'client-id' };
    tokenValidator.validate.mockResolvedValue(payload);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(context.switchToHttp().getRequest()['user']).toEqual(payload);
  });

  it('should throw UnauthorizedException if token is invalid (InvalidTokenException)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext('Bearer invalid.token.here');
    tokenValidator.validate.mockRejectedValue(
      new InvalidTokenException('Expired'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
