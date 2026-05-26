import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseController } from './purchase.controller';
import { CreatePurchaseUseCase } from '../../../application/use-cases/create-purchase.use-case';
import { GetConvertedPurchaseUseCase } from '../../../application/use-cases/get-converted-purchase.use-case';
import { CreatePurchaseInputInterfaceDto } from './dtos/create-purchase-input-interface.dto';

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
    createPurchaseUseCase = module.get(CreatePurchaseUseCase) as any;
    getConvertedPurchaseUseCase = module.get(GetConvertedPurchaseUseCase) as any;
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
      } as any;
      createPurchaseUseCase.execute.mockResolvedValue(expectedUseCaseResult);

      const result = await controller.createPurchase(purchaseDto);

      expect(createPurchaseUseCase.execute).toHaveBeenCalledWith({
        description: purchaseDto.description,
        transactionDate: purchaseDto.transactionDate,
        purchaseAmountUsd: purchaseDto.purchaseAmountUsd,
      });
      expect(result).toEqual(expectedUseCaseResult);
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
      } as any;

      getConvertedPurchaseUseCase.execute.mockResolvedValue(expectedUseCaseResult);

      const result = await controller.getConvertedPurchase(id, targetCurrency);

      expect(getConvertedPurchaseUseCase.execute).toHaveBeenCalledWith({
        purchaseId: id,
        targetCurrency,
      });
      expect(result).toEqual(expectedUseCaseResult);
    });
  });
});
