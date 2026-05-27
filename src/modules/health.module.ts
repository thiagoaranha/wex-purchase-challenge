import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from '../interfaces/http/health/health.controller';
import { PrismaHealthIndicator } from '../interfaces/http/health/prisma-health.indicator';
import { PrismaModule } from './prisma.module';
import { AppConfig } from '../shared/config/app-config';

@Module({
  imports: [
    TerminusModule,
    HttpModule.register({ timeout: AppConfig.healthCheckTimeoutMs }),
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
