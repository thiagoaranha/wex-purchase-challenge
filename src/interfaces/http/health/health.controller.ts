import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      app: 'wex-purchase-api-node',
    };
  }

  @Get('live')
  @HealthCheck()
  live() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      app: 'wex-purchase-api-node',
    };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaHealthIndicator.isHealthy('database'),
    ]);
  }
}
