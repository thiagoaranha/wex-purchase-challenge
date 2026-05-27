import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { HealthCheckError } from '@nestjs/terminus';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  it('should return healthy status if query succeeds', async () => {
    prismaService.$queryRawUnsafe.mockResolvedValue([1]);

    const result = await indicator.isHealthy('database');

    expect(result).toEqual({
      database: {
        status: 'up',
      },
    });
    expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('should throw HealthCheckError if query fails', async () => {
    prismaService.$queryRawUnsafe.mockRejectedValue(new Error('Connection failed'));

    await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
  });

  it('should throw HealthCheckError with custom message containing connection error code', async () => {
    const prismaError: any = new Error('Some error');
    prismaError.code = 'ECONNREFUSED';
    prismaService.$queryRawUnsafe.mockRejectedValue(prismaError);

    await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);

    try {
      await indicator.isHealthy('database');
    } catch (err: any) {
      expect(err.causes.database.message).toBe("Database connection failed (ECONNREFUSED)");
    }
  });

  it('should throw HealthCheckError with UNKNOWN code if no code is present on error', async () => {
    prismaService.$queryRawUnsafe.mockRejectedValue(new Error('Generic failure'));

    await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);

    try {
      await indicator.isHealthy('database');
    } catch (err: any) {
      expect(err.causes.database.message).toBe("Database connection failed (UNKNOWN)");
    }
  });
});
