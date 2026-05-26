import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { CreatePurchaseInputInterfaceDto } from './dtos/create-purchase-input-interface.dto';
import { CreatePurchaseOutputInterfaceDto } from './dtos/create-purchase-output-interface.dto';
import { GetConvertedPurchaseOutputInterfaceDto } from './dtos/get-converted-purchase-output-interface.dto';
import { CreatePurchaseUseCase } from '../../../application/use-cases/create-purchase.use-case';
import { GetConvertedPurchaseUseCase } from '../../../application/use-cases/get-converted-purchase.use-case';
import { CreatePurchaseInputDto } from '../../../application/dtos/create-purchase.dto';

@Controller('purchase')
export class PurchaseController {
  constructor(
    private readonly createPurchaseUseCase: CreatePurchaseUseCase,
    private readonly getConvertedPurchaseUseCase: GetConvertedPurchaseUseCase,
  ) { }

  @Post()
  @ApiResponse({ type: CreatePurchaseOutputInterfaceDto, status: 201 })
  async createPurchase(
    @Body() purchaseDto: CreatePurchaseInputInterfaceDto,
  ): Promise<CreatePurchaseOutputInterfaceDto> {
    const createPurchaseInputDto: CreatePurchaseInputDto = {
      description: purchaseDto.description,
      transactionDate: purchaseDto.transactionDate,
      purchaseAmountUsd: purchaseDto.purchaseAmountUsd,
    };

    const result = await this.createPurchaseUseCase.execute(createPurchaseInputDto);

    return {
      id: result.id,
      description: result.description,
      transactionDate: result.transactionDate,
      purchaseAmountUsd: result.purchaseAmountUsd,
    };
  }

  @Get(':id')
  @ApiResponse({ type: GetConvertedPurchaseOutputInterfaceDto, status: 200 })
  async getConvertedPurchase(
    @Param('id') purchaseId: string,
    @Query('targetCurrency') targetCurrency: string,
  ): Promise<GetConvertedPurchaseOutputInterfaceDto> {
    const result = await this.getConvertedPurchaseUseCase.execute({
      purchaseId,
      targetCurrency,
    });

    return {
      id: result.id,
      description: result.description,
      transactionDate: result.transactionDate,
      purchaseAmountUsd: result.purchaseAmountUsd,
      targetCurrency: result.targetCurrency,
      exchangeRate: result.exchangeRate,
      convertedAmount: result.convertedAmount,
    };
  }
}
