import { Test, TestingModule } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { ITokenIssuer, TOKEN_ISSUER_PORT } from '../interfaces/token-issuer';
import { AppConfig } from '../../shared/config/app-config';
import { InvalidCredentialsException } from '../errors/invalid-credentials.exception';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let tokenIssuer: jest.Mocked<ITokenIssuer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: TOKEN_ISSUER_PORT,
          useValue: {
            issue: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
    tokenIssuer = module.get(TOKEN_ISSUER_PORT);
  });

  it('should return token result for valid credentials', async () => {
    const expectedResult = {
      accessToken: 'token123',
      expiresIn: 3600,
      tokenType: 'Bearer' as const,
    };
    tokenIssuer.issue.mockResolvedValue(expectedResult);

    const result = await useCase.execute({
      clientId: AppConfig.authClientId,
      clientSecret: AppConfig.authClientSecret,
    });

    expect(result).toEqual(expectedResult);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokenIssuer.issue).toHaveBeenCalledWith(AppConfig.authClientId);
  });

  it('should throw InvalidCredentialsException for invalid client ID', async () => {
    await expect(
      useCase.execute({
        clientId: 'invalid-client',
        clientSecret: AppConfig.authClientSecret,
      }),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('should throw InvalidCredentialsException for invalid client secret', async () => {
    await expect(
      useCase.execute({
        clientId: AppConfig.authClientId,
        clientSecret: 'invalid-secret',
      }),
    ).rejects.toThrow(InvalidCredentialsException);
  });
});
