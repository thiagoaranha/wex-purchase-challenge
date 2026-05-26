import { IsISO8601, IsString, Length, Matches, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseInputInterfaceDto {
    @IsString()
    @IsNotEmpty()
    @Length(1, 50, { message: 'Description must be between 1 and 50 characters' })
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
    @ApiProperty({ name: 'description', type: 'string', example: 'payment' })
    readonly description: string = '';

    @IsISO8601()
    @Length(10, 10, { message: 'Transaction date must be in YYYY-MM-DD format' })
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
    @ApiProperty({ name: 'transactionDate', type: 'string', example: '2026-01-01' })
    readonly transactionDate: string = '';

    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Purchase amount must be a valid positive monetary value with up to 2 decimal places' })
    @ApiProperty({ name: 'purchaseAmountUsd', type: 'string', example: '123.45' })
    readonly purchaseAmountUsd: string = '';
}

