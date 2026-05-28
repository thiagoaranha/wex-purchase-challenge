import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { Public } from '../auth/public.decorator';

@ApiTags('Health Check')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Generic health check',
    description: 'Returns basic up status and timestamp for the application.',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      app: 'wex-purchase-api-node',
    };
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Simple check to verify the application container is running.',
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      app: 'wex-purchase-api-node',
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Verifies backing services (like PostgreSQL) are responsive and ready to accept traffic.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to handle requests',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready (database is down)',
  })
  ready() {
    return this.health.check([
      () => this.prismaHealthIndicator.isHealthy('database'),
    ]);
  }
}
