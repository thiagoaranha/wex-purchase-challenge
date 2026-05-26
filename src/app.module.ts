import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health.module';
import { PurchaseModule } from './modules/purchase.module';

@Module({
  imports: [HealthModule, PurchaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
