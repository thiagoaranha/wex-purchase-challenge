import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { LoginInputDto } from './dtos/login-input.dto';
import { LoginOutputDto } from './dtos/login-output.dto';
import { Public } from './public.decorator';
import { InvalidCredentialsException } from '../../../application/errors/invalid-credentials.exception';
// If a specific filter is needed, it can be applied here.
// Otherwise, the global HttpExceptionFilter catches and formats UnauthorizedException.

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Public()
  @Post('token')
  @ApiOperation({
    summary: 'Generate M2M Access Token',
    description:
      'Generates a JWT access token using static client credentials. This endpoint is public.',
  })
  @ApiResponse({
    type: LoginOutputDto,
    status: 200,
    description: 'Token successfully generated',
  })
  @ApiResponse({ status: 401, description: 'Invalid client credentials' })
  async login(@Body() input: LoginInputDto): Promise<LoginOutputDto> {
    try {
      const finalClientId = input.username || input.clientId;
      const finalClientSecret = input.password || input.clientSecret;

      if (!finalClientId || !finalClientSecret) {
        throw new UnauthorizedException('Missing client credentials');
      }

      const result = await this.loginUseCase.execute({
        clientId: finalClientId,
        clientSecret: finalClientSecret,
      });

      return {
        access_token: result.accessToken,
        expires_in: result.expiresIn,
        token_type: result.tokenType,
      };
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
