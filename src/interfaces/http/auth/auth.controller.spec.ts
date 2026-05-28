import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { UnauthorizedException } from '@nestjs/common';
import { InvalidCredentialsException } from '../../../application/errors/invalid-credentials.exception';
import { LoginInputDto } from './dtos/login-input.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let loginUseCase: jest.Mocked<LoginUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: LoginUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    loginUseCase = module.get(LoginUseCase);
  });

  it('should return login output for valid credentials', async () => {
    const useCaseResult = {
      accessToken: 'token123',
      expiresIn: 3600,
      tokenType: 'Bearer' as const,
    };
    
    const expectedOutput = {
      access_token: 'token123',
      expires_in: 3600,
      token_type: 'Bearer',
    };
    loginUseCase.execute.mockResolvedValue(useCaseResult);

    const input: LoginInputDto = {
      clientId: 'valid-client',
      clientSecret: 'valid-secret',
    };

    const result = await controller.login(input);

    expect(result).toEqual(expectedOutput);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(loginUseCase.execute).toHaveBeenCalledWith({
      clientId: 'valid-client',
      clientSecret: 'valid-secret',
    });
  });

  it('should throw UnauthorizedException when InvalidCredentialsException is thrown by UseCase', async () => {
    loginUseCase.execute.mockRejectedValue(new InvalidCredentialsException());

    const input: LoginInputDto = {
      clientId: 'invalid-client',
      clientSecret: 'invalid-secret',
    };

    await expect(controller.login(input)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
