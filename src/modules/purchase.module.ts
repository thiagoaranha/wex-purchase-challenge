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

@Module({
  imports: [
    PrismaModule,
    HttpModule,
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
      useFactory: (repo, idGen, clock) => new CreatePurchaseUseCase(repo, idGen, clock),
      inject: [PURCHASE_REPOSITORY, UuidGenerator, SystemClock],
    },
    {
      provide: GetConvertedPurchaseUseCase,
      useFactory: (repo, exchangeProvider, clock) =>
        new GetConvertedPurchaseUseCase(repo, exchangeProvider, clock),
      inject: [PURCHASE_REPOSITORY, TreasuryExchangeRateProvider, SystemClock],
    },
  ],
  exports: [PURCHASE_REPOSITORY],
})
export class PurchaseModule { }
