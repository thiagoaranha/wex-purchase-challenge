import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { correlationIdStorage } from './correlation-id.storage';
import { PinoLoggerService } from './pino-logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      randomUUID();

    res.setHeader('x-correlation-id', correlationId);

    correlationIdStorage.run(correlationId, () => {
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { method, originalUrl } = req;
        const { statusCode } = res;
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          'HTTP',
        );
      });
      next();
    });
  }
}
