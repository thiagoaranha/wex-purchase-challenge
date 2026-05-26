import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health.module';
import { PurchaseModule } from './modules/purchase.module';
import { AppConfig } from './shared/config/app-config';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: AppConfig.rateLimitTtlMs,
        limit: AppConfig.rateLimitMaxRequests,
      },
    ]),
    HealthModule,
    PurchaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate-limiting guard applied globally to all routes.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

