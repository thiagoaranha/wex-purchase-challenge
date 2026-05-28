import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuerAdapter } from './jwt-token-issuer.adapter';
import { AppConfig } from '../../shared/config/app-config';

describe('JwtTokenIssuerAdapter', () => {
  let adapter: JwtTokenIssuerAdapter;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenIssuerAdapter,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<JwtTokenIssuerAdapter>(JwtTokenIssuerAdapter);
    jwtService = module.get(JwtService);
  });

  it('should issue a valid token', async () => {
    const mockToken = 'mock.jwt.token';
    jwtService.signAsync.mockResolvedValue(mockToken);

    const result = await adapter.issue('test-client');

    expect(result).toEqual({
      accessToken: mockToken,
      expiresIn: AppConfig.jwtAccessTokenTtlSeconds,
      tokenType: 'Bearer',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'test-client' },
      { expiresIn: AppConfig.jwtAccessTokenTtlSeconds },
    );
  });
});
