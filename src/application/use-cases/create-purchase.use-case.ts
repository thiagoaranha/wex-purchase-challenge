import { Purchase } from '../../domain/entities/purchase';
import { CurrencyCode } from '../../domain/value-objects/currency-code';
import { Description } from '../../domain/value-objects/description';
import { Money } from '../../domain/value-objects/money';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { TransactionDate } from '../../domain/value-objects/transaction-date';
import {
  CreatePurchaseInputDto,
  CreatePurchaseOutputDto,
} from '../dtos/create-purchase.dto';
import { IdGenerator } from '../interfaces/id-generator';
import { PurchaseRepository } from '../interfaces/purchase-repository';

export class CreatePurchaseUseCase {
  constructor(
    private readonly purchaseRepository: PurchaseRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(
    input: CreatePurchaseInputDto,
  ): Promise<CreatePurchaseOutputDto> {

    const purchase = Purchase.create({
      id: PurchaseId.create(this.idGenerator.generate()),
      description: Description.create(input.description),
      transactionDate: TransactionDate.create(input.transactionDate),
      purchaseAmountUsd: Money.create(
        input.purchaseAmountUsd,
        CurrencyCode.usd(),
      ),
    });

    await this.purchaseRepository.save(purchase);

    return {
      id: purchase.id.value,
      description: purchase.description.value,
      transactionDate: purchase.transactionDate.value,
      purchaseAmountUsd: purchase.purchaseAmountUsd.toDecimalString(),
    };
  }
}
