import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { Purchase } from '../../domain/entities/purchase';
import { CurrencyCode } from '../../domain/value-objects/currency-code';
import { Description } from '../../domain/value-objects/description';
import { Money } from '../../domain/value-objects/money';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { TransactionDate } from '../../domain/value-objects/transaction-date';
import { PrismaPurchaseRepository } from './prisma-purchase.repository';

describe('PrismaPurchaseRepository', () => {
  const mockPrisma = {
    purchase: {
      upsert: jest.fn<
        Prisma.Prisma__PurchaseClient<any, any, any>,
        [Prisma.PurchaseUpsertArgs<any>]
      >(),
      findUnique: jest.fn<
        Prisma.Prisma__PurchaseClient<any, any, any>,
        [Prisma.PurchaseFindUniqueArgs<any>]
      >(),
    },
  };

  const repository = new PrismaPurchaseRepository(
    mockPrisma as unknown as PrismaClient,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createPurchase(): Purchase {
    return Purchase.create({
      id: PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
      description: Description.create('Office supplies'),
      transactionDate: TransactionDate.create('2026-05-23'),
      purchaseAmountUsd: Money.create('125.49', CurrencyCode.usd()),
    });
  }

  it('should persist a purchase without changing the monetary value', async () => {
    const purchase = createPurchase();

    await repository.save(purchase);

    expect(mockPrisma.purchase.upsert).toHaveBeenCalledWith({
      where: { id: purchase.id.value },
      create: {
        id: purchase.id.value,
        description: purchase.description.value,
        transactionDate: purchase.transactionDate.toDate(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        purchaseAmountUsd: expect.any(Prisma.Decimal),
      },
      update: {
        description: purchase.description.value,
        transactionDate: purchase.transactionDate.toDate(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        purchaseAmountUsd: expect.any(Prisma.Decimal),
      },
    });

    const [args] = mockPrisma.purchase.upsert.mock.calls[0] as unknown as [
      {
        create: { purchaseAmountUsd: Prisma.Decimal };
        update: { purchaseAmountUsd: Prisma.Decimal };
      },
    ];

    expect(args.create.purchaseAmountUsd.toString()).toBe('125.49');
    expect(args.update.purchaseAmountUsd.toString()).toBe('125.49');
  });

  it('should return null when the purchase does not exist', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValue(null);

    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });

  it('should reconstruct a purchase from the database record', async () => {
    mockPrisma.purchase.findUnique.mockResolvedValue({
      id: '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
      description: 'Office supplies',
      transactionDate: new Date('2026-05-23T15:45:12.000Z'),
      purchaseAmountUsd: new Prisma.Decimal('125.4900'),
    });

    const purchase = await repository.findById(
      '8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1',
    );

    expect(purchase).not.toBeNull();
    expect(purchase?.id.value).toBe('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1');
    expect(purchase?.description.value).toBe('Office supplies');
    expect(purchase?.transactionDate.value).toBe('2026-05-23');
    expect(purchase?.purchaseAmountUsd.toDecimalString()).toBe('125.49');
    expect(
      purchase?.purchaseAmountUsd.currency.equals(CurrencyCode.usd()),
    ).toBe(true);
  });
});
