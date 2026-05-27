import { CreatePurchaseUseCase } from './create-purchase.use-case';
import { IdGenerator } from '../interfaces/id-generator';
import { PurchaseRepository } from '../interfaces/purchase-repository';
import { Purchase } from '../../domain/entities/purchase';

class FakePurchaseRepository implements PurchaseRepository {
  private readonly purchases = new Map<string, Purchase>();

  save(purchase: Purchase): Promise<void> {
    this.purchases.set(purchase.id.value, purchase);
    return Promise.resolve();
  }

  findById(id: string): Promise<Purchase | null> {
    return Promise.resolve(this.purchases.get(id) ?? null);
  }
}

class FakeIdGenerator implements IdGenerator {
  constructor(private readonly value: string) {}

  generate(): string {
    return this.value;
  }
}

describe('CreatePurchaseUseCase', () => {
  it('should create and persist a purchase using the provided id generator', async () => {
    const repository = new FakePurchaseRepository();
    const useCase = new CreatePurchaseUseCase(
      repository,
      new FakeIdGenerator('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
    );

    const result = await useCase.execute({
      description: 'Office supplies',
      transactionDate: '2026-05-23',
      purchaseAmountUsd: '125.49',
    });

    expect(result).toEqual({
      id: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
      description: 'Office supplies',
      transactionDate: '2026-05-23',
      purchaseAmountUsd: '125.49',
    });
    await expect(repository.findById(result.id)).resolves.not.toBeNull();
  });

  it('should round the purchase amount to cents before persisting', async () => {
    const repository = new FakePurchaseRepository();
    const useCase = new CreatePurchaseUseCase(
      repository,
      new FakeIdGenerator('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
    );

    const result = await useCase.execute({
      description: 'Office supplies',
      transactionDate: '2026-05-23',
      purchaseAmountUsd: '125.495',
    });

    expect(result.purchaseAmountUsd).toBe('125.50');
  });
});
