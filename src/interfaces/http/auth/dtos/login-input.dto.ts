import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LoginInputDto {
  @ApiPropertyOptional({ description: 'Client ID for M2M authentication' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Client secret for M2M authentication' })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  // OAuth2 password flow compatibility
  @ApiPropertyOptional({ description: 'OAuth2 username (mapped to clientId)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'OAuth2 password (mapped to clientSecret)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'OAuth2 Grant Type' })
  @IsOptional()
  @IsString()
  grant_type?: string;
}
