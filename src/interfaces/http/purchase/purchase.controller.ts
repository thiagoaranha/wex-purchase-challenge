import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiOAuth2,
} from '@nestjs/swagger';
import { CreatePurchaseInputInterfaceDto } from './dtos/create-purchase-input-interface.dto';
import { CreatePurchaseOutputInterfaceDto } from './dtos/create-purchase-output-interface.dto';
import { GetConvertedPurchaseOutputInterfaceDto } from './dtos/get-converted-purchase-output-interface.dto';
import { CreatePurchaseUseCase } from '../../../application/use-cases/create-purchase.use-case';
import { GetConvertedPurchaseUseCase } from '../../../application/use-cases/get-converted-purchase.use-case';
import { CreatePurchaseInputDto } from '../../../application/dtos/create-purchase.dto';
import { TreasuryUnavailableExceptionFilter } from './filters/treasury-unavailable-exception.filter';
import { DomainErrorExceptionFilter } from './filters/domain-error-exception.filter';

@ApiTags('Purchase')
@ApiOAuth2([])
@Controller('purchase')
@UseFilters(DomainErrorExceptionFilter)
export class PurchaseController {
  constructor(
    private readonly createPurchaseUseCase: CreatePurchaseUseCase,
    private readonly getConvertedPurchaseUseCase: GetConvertedPurchaseUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new purchase transaction',
    description:
      'Stores a new purchase transaction with description, date, and USD amount.',
  })
  @ApiResponse({ type: CreatePurchaseOutputInterfaceDto, status: 201 })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Validation failed (invalid description, date, or amount)',
  })
  async createPurchase(
    @Body() purchaseDto: CreatePurchaseInputInterfaceDto,
  ): Promise<CreatePurchaseOutputInterfaceDto> {
    const createPurchaseInputDto: CreatePurchaseInputDto = {
      description: purchaseDto.description,
      transactionDate: purchaseDto.transactionDate,
      purchaseAmountUsd: purchaseDto.purchaseAmountUsd,
    };

    const result = await this.createPurchaseUseCase.execute(
      createPurchaseInputDto,
    );

    return {
      id: result.id,
      description: result.description,
      transactionDate: result.transactionDate,
      purchaseAmountUsd: result.purchaseAmountUsd,
    };
  }

  @Get(':id')
  @UseFilters(TreasuryUnavailableExceptionFilter)
  @ApiOperation({
    summary: 'Retrieve converted purchase amount',
    description:
      'Retrieves a purchase transaction and converts its USD amount to the specified target currency using the active exchange rate from the Treasury API.',
  })
  @ApiResponse({ type: GetConvertedPurchaseOutputInterfaceDto, status: 200 })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Purchase not found or invalid purchase ID format',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid currency code format',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unsupported currency or no valid exchange rate available',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Exchange rate provider is unavailable',
  })
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
