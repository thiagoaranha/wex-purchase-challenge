import { ApiProperty } from '@nestjs/swagger';

export class LoginOutputDto {
  @ApiProperty({ description: 'The JWT access token' })
  access_token!: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expires_in!: number;

  @ApiProperty({ description: 'Token type (e.g., Bearer)', example: 'Bearer' })
  token_type!: 'Bearer';
}
