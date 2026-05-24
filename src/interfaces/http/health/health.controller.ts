import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      app: 'wex-purchase-api-node',
    };
  }
}
