import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseOutputInterfaceDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string = '';

  @ApiProperty({ example: 'payment' })
  description: string = '';

  @ApiProperty({ example: '2026-01-01' })
  transactionDate: string = '';

  @ApiProperty({ example: '123.45' })
  purchaseAmountUsd: string = '';
}
