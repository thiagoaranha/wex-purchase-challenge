import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenValidatorAdapter } from './jwt-token-validator.adapter';
import { InvalidTokenException } from './invalid-token.exception';

describe('JwtTokenValidatorAdapter', () => {
  let adapter: JwtTokenValidatorAdapter;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenValidatorAdapter,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<JwtTokenValidatorAdapter>(JwtTokenValidatorAdapter);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  it('should return payload for valid token', async () => {
    const payload = { sub: 'test-client' };
    jwtService.verifyAsync.mockResolvedValue(payload);

    const result = await adapter.validate('valid-token');

    expect(result).toEqual(payload);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
  });

  it('should throw InvalidTokenException for invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(adapter.validate('expired-token')).rejects.toThrow(
      InvalidTokenException,
    );
  });
});
