import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseController } from './purchase.controller';
import { CreatePurchaseUseCase } from '../../../application/use-cases/create-purchase.use-case';
import { GetConvertedPurchaseUseCase } from '../../../application/use-cases/get-converted-purchase.use-case';
import { CreatePurchaseInputInterfaceDto } from './dtos/create-purchase-input-interface.dto';
import { TreasuryApiUnavailableError } from '../../../infrastructure/treasury/treasury-api-unavailable.error';
import { InvalidDescriptionError } from '../../../domain/errors/purchase-domain-errors';
import { PurchaseNotFoundError } from '../../../application/errors/purchase-not-found.error';
import {
  NoValidExchangeRateError,
  UnsupportedExchangeRateCurrencyError,
} from '../../../application/errors/exchange-rate-conversion.error';

describe('PurchaseController', () => {
  let controller: PurchaseController;
  let createPurchaseUseCase: jest.Mocked<CreatePurchaseUseCase>;
  let getConvertedPurchaseUseCase: jest.Mocked<GetConvertedPurchaseUseCase>;

  beforeEach(async () => {
    const mockCreatePurchaseUseCase = {
      execute: jest.fn(),
    };
    const mockGetConvertedPurchaseUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseController],
      providers: [
        {
          provide: CreatePurchaseUseCase,
          useValue: mockCreatePurchaseUseCase,
        },
        {
          provide: GetConvertedPurchaseUseCase,
          useValue: mockGetConvertedPurchaseUseCase,
        },
      ],
    }).compile();

    controller = module.get<PurchaseController>(PurchaseController);
    createPurchaseUseCase = module.get(CreatePurchaseUseCase);
    getConvertedPurchaseUseCase = module.get(GetConvertedPurchaseUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPurchase', () => {
    it('should map the DTO and call CreatePurchaseUseCase.execute', async () => {
      const purchaseDto: CreatePurchaseInputInterfaceDto = {
        description: 'Test description',
        transactionDate: '2023-01-01',
        purchaseAmountUsd: '100.00',
      };

      const expectedUseCaseResult = {
        id: 'some-id',
        description: 'Test description',
        transactionDate: '2023-01-01',
        purchaseAmountUsd: '100.00',
      };
      createPurchaseUseCase.execute.mockResolvedValue(expectedUseCaseResult);

      const result = await controller.createPurchase(purchaseDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(createPurchaseUseCase.execute).toHaveBeenCalledWith({
        description: purchaseDto.description,
        transactionDate: purchaseDto.transactionDate,
        purchaseAmountUsd: purchaseDto.purchaseAmountUsd,
      });
      expect(result).toEqual(expectedUseCaseResult);
    });

    it('should propagate DomainError so the exception filter can handle it', async () => {
      const domainError = new InvalidDescriptionError(
        'too_long',
        'a'.repeat(51),
      );
      createPurchaseUseCase.execute.mockRejectedValue(domainError);

      await expect(
        controller.createPurchase({
          description: 'a'.repeat(51),
          transactionDate: '2023-01-01',
          purchaseAmountUsd: '100.00',
        }),
      ).rejects.toThrow(InvalidDescriptionError);
    });
  });

  describe('getConvertedPurchase', () => {
    it('should call GetConvertedPurchaseUseCase.execute with correct parameters', async () => {
      const id = 'some-uuid';
      const targetCurrency = 'BRL';
      const expectedUseCaseResult = {
        id: 'some-uuid',
        description: 'some desc',
        transactionDate: '2023-01-01',
        purchaseAmountUsd: '100.00',
        targetCurrency: 'BRL',
        exchangeRate: '5.5',
        convertedAmount: '550.00',
      };

      getConvertedPurchaseUseCase.execute.mockResolvedValue(
        expectedUseCaseResult,
      );

      const result = await controller.getConvertedPurchase(id, targetCurrency);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(getConvertedPurchaseUseCase.execute).toHaveBeenCalledWith({
        purchaseId: id,
        targetCurrency,
      });
      expect(result).toEqual(expectedUseCaseResult);
    });

    it('should propagate TreasuryApiUnavailableError so the exception filter can handle it', async () => {
      getConvertedPurchaseUseCase.execute.mockRejectedValue(
        new TreasuryApiUnavailableError(),
      );

      await expect(
        controller.getConvertedPurchase('some-id', 'BRL'),
      ).rejects.toThrow(TreasuryApiUnavailableError);
    });

    it('should propagate unknown errors for NestJS default exception handling', async () => {
      getConvertedPurchaseUseCase.execute.mockRejectedValue(
        new Error('Some unexpected error'),
      );

      await expect(
        controller.getConvertedPurchase('some-id', 'BRL'),
      ).rejects.toThrow('Some unexpected error');
    });

    it('should propagate PurchaseNotFoundError so the exception filter can handle it', async () => {
      getConvertedPurchaseUseCase.execute.mockRejectedValue(
        new PurchaseNotFoundError('some-id'),
      );

      await expect(
        controller.getConvertedPurchase('some-id', 'BRL'),
      ).rejects.toThrow(PurchaseNotFoundError);
    });

    it('should propagate UnsupportedExchangeRateCurrencyError so the exception filter can handle it', async () => {
      getConvertedPurchaseUseCase.execute.mockRejectedValue(
        new UnsupportedExchangeRateCurrencyError('XYZ'),
      );

      await expect(
        controller.getConvertedPurchase('some-id', 'XYZ'),
      ).rejects.toThrow(UnsupportedExchangeRateCurrencyError);
    });

    it('should propagate NoValidExchangeRateError so the exception filter can handle it', async () => {
      getConvertedPurchaseUseCase.execute.mockRejectedValue(
        new NoValidExchangeRateError('BRL', '2020-01-01'),
      );

      await expect(
        controller.getConvertedPurchase('some-id', 'BRL'),
      ).rejects.toThrow(NoValidExchangeRateError);
    });
  });
});
