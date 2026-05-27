import '../src/shared/config/env';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Purchase } from '../src/domain/entities/purchase';
import { CurrencyCode } from '../src/domain/value-objects/currency-code';
import { Description } from '../src/domain/value-objects/description';
import { Money } from '../src/domain/value-objects/money';
import { PurchaseId } from '../src/domain/value-objects/purchase-id';
import { TransactionDate } from '../src/domain/value-objects/transaction-date';
import { PrismaPurchaseRepository } from '../src/infrastructure/prisma/prisma-purchase.repository';

function buildTestDatabaseUrl(): string {
  const baseUrl =
    process.env.DATABASE_URL ??
    'postgresql://wex_user:wex_password@localhost:5432/wex_db?schema=public';

  const url = new URL(baseUrl);
  url.searchParams.set('schema', 'public');

  return url.toString();
}

function migrateDeploy(databaseUrl: string): void {
  if (process.env.CI) {
    execSync('pnpm prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'inherit',
    });
    return;
  }

  const schemaEngineSource = `${process.cwd()}\\node_modules\\@prisma\\engines\\node_modules\\.cache\\prisma\\master\\c2990dca591cba766e3b7ef5d9e8a84796e47ab7\\windows\\schema-engine`;
  const schemaEngineBinary =
    'C:\\Users\\thiag\\.codex\\memories\\prisma\\schema-engine.exe';

  mkdirSync('C:\\Users\\thiag\\.codex\\memories\\prisma', { recursive: true });

  if (!existsSync(schemaEngineBinary)) {
    copyFileSync(schemaEngineSource, schemaEngineBinary);
  }

  execSync('pnpm prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PRISMA_SCHEMA_ENGINE_BINARY: schemaEngineBinary,
    },
    stdio: 'inherit',
  });
}

describe('PrismaPurchaseRepository', () => {
  const databaseUrl = buildTestDatabaseUrl();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  const repository = new PrismaPurchaseRepository(prisma);

  beforeAll(async () => {
    migrateDeploy(databaseUrl);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.purchase.deleteMany();
  });

  afterAll(async () => {
    await prisma.purchase.deleteMany();
    await prisma.$disconnect();
  });

  it('should persist and retrieve a purchase without losing monetary precision', async () => {
    const purchase = Purchase.create({
      id: PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
      description: Description.create('Office supplies'),
      transactionDate: TransactionDate.create('2026-05-23'),
      purchaseAmountUsd: Money.create('1234567890.12', CurrencyCode.usd()),
    });

    await repository.save(purchase);

    const stored = await repository.findById(purchase.id.value);

    expect(stored).not.toBeNull();
    expect(stored?.id.value).toBe(purchase.id.value);
    expect(stored?.description.value).toBe('Office supplies');
    expect(stored?.transactionDate.value).toBe('2026-05-23');
    expect(stored?.purchaseAmountUsd.toDecimalString()).toBe('1234567890.12');
  });

  it('should return null when the purchase does not exist', async () => {
    await expect(
      repository.findById('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
    ).resolves.toBeNull();
  });
});
