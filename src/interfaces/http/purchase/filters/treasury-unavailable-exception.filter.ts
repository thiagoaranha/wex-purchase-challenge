import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { TreasuryApiUnavailableError } from '../../../../infrastructure/treasury/treasury-api-unavailable.error';

/**
 * Maps TreasuryApiUnavailableError to HTTP 503 Service Unavailable.
 *
 * Separating this concern from the controller keeps request handlers clean
 * and ensures consistent error shape across all endpoints that may trigger
 * a Treasury API call.
 */
@Catch(TreasuryApiUnavailableError)
export class TreasuryUnavailableExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TreasuryUnavailableExceptionFilter.name);

  catch(exception: TreasuryApiUnavailableError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.warn(`Treasury API unavailable: ${exception.message}`);

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message: exception.message,
    });
  }
}
