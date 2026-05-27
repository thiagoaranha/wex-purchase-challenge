import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<Pick<HealthCheckService, 'check'>>;
  let prismaHealthIndicator: jest.Mocked<
    Pick<PrismaHealthIndicator, 'isHealthy'>
  >;

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn(),
    };
    prismaHealthIndicator = {
      isHealthy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: prismaHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return check health status', () => {
    const result = controller.check();
    expect(result).toHaveProperty('status', 'up');
    expect(result).toHaveProperty('app', 'wex-purchase-api-node');
    expect(result).toHaveProperty('timestamp');
  });

  it('should return live health status', () => {
    const result = controller.live();
    expect(result).toHaveProperty('status', 'up');
    expect(result).toHaveProperty('app', 'wex-purchase-api-node');
    expect(result).toHaveProperty('timestamp');
  });

  it('should call check with prisma indicator on ready endpoint', async () => {
    healthCheckService.check.mockResolvedValue({ status: 'ok' });
    prismaHealthIndicator.isHealthy.mockResolvedValue({
      database: { status: 'up' },
    });

    const result = await controller.ready();

    expect(result).toEqual({ status: 'ok' });
    expect(healthCheckService.check).toHaveBeenCalledWith([
      expect.any(Function),
    ]);

    // Execute the callback passed to healthCheckService.check
    const checkFn = healthCheckService.check.mock
      .calls[0][0][0] as () => Promise<unknown>;
    await checkFn();
    expect(prismaHealthIndicator.isHealthy).toHaveBeenCalledWith('database');
  });
});
