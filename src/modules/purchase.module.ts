import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './prisma.module';
import { PrismaPurchaseRepository } from '../infrastructure/prisma/prisma-purchase.repository';
import { PURCHASE_REPOSITORY } from '../application/interfaces/purchase-repository';
import { PurchaseController } from '../interfaces/http/purchase/purchase.controller';
import { CreatePurchaseUseCase } from '../application/use-cases/create-purchase.use-case';
import { GetConvertedPurchaseUseCase } from '../application/use-cases/get-converted-purchase.use-case';
import { SystemClock } from '../infrastructure/clock/system-clock';
import { UuidGenerator } from '../infrastructure/id-generator/uuid-generator';
import { TreasuryExchangeRateProvider } from '../infrastructure/treasury/treasury-exchange-rate.provider';
import { AppConfig } from '../shared/config/app-config';

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({ timeout: AppConfig.treasuryApiTimeoutMs }),
  ],
  controllers: [PurchaseController],
  providers: [
    SystemClock,
    UuidGenerator,
    TreasuryExchangeRateProvider,
    PrismaPurchaseRepository,
    {
      provide: PURCHASE_REPOSITORY,
      useExisting: PrismaPurchaseRepository,
    },
    {
      provide: CreatePurchaseUseCase,
      useFactory: (
        repo: import('../application/interfaces/purchase-repository').PurchaseRepository,
        idGen: import('../application/interfaces/id-generator').IdGenerator,
      ) => new CreatePurchaseUseCase(repo, idGen),
      inject: [PURCHASE_REPOSITORY, UuidGenerator],
    },
    {
      provide: GetConvertedPurchaseUseCase,
      useFactory: (
        repo: import('../application/interfaces/purchase-repository').PurchaseRepository,
        exchangeProvider: import('../application/interfaces/exchange-rate-provider').ExchangeRateProvider,
      ) => new GetConvertedPurchaseUseCase(repo, exchangeProvider),
      inject: [PURCHASE_REPOSITORY, TreasuryExchangeRateProvider],
    },
  ],
  exports: [PURCHASE_REPOSITORY],
})
export class PurchaseModule {}
