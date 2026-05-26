import { Global, Module } from '@nestjs/common';
import { PinoLoggerService } from '../infrastructure/logging/pino-logger.service';
import { LoggingMiddleware } from '../infrastructure/logging/logging.middleware';

@Global()
@Module({
  providers: [PinoLoggerService, LoggingMiddleware],
  exports: [PinoLoggerService, LoggingMiddleware],
})
export class LoggingModule {}
