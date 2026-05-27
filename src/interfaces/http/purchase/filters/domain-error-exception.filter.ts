import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../../../domain/errors/domain-error';

/**
 * Maps every DomainError subclass to the appropriate HTTP status code using
 * the error's `code` discriminant.
 *
 * Why a filter instead of try/catch in the controller?
 * - Keeps request handlers free of cross-cutting error-mapping concerns (SRP).
 * - Centralises the domain-code → HTTP-status table in one place.
 * - Mirrors the pattern already used for TreasuryUnavailableExceptionFilter.
 *
 * Unknown DomainError codes fall back to 500 so that unmapped errors are
 * visible in logs rather than swallowed silently.
 */
@Catch(DomainError)
export class DomainErrorExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorExceptionFilter.name);

  /**
   * Maps each domain error `code` to its HTTP status.
   * Entries default to 500 when the code is absent from this map.
   */
  private static readonly STATUS_MAP: ReadonlyMap<string, HttpStatus> = new Map(
    [
      ['INVALID_PURCHASE_ID', HttpStatus.NOT_FOUND],
      ['INVALID_DESCRIPTION', HttpStatus.UNPROCESSABLE_ENTITY],
      ['INVALID_TRANSACTION_DATE', HttpStatus.UNPROCESSABLE_ENTITY],
      ['INVALID_MONEY', HttpStatus.UNPROCESSABLE_ENTITY],
      ['INVALID_CURRENCY_CODE', HttpStatus.BAD_REQUEST],
      ['INVALID_EXCHANGE_RATE', HttpStatus.UNPROCESSABLE_ENTITY],
      ['PURCHASE_AMOUNT_MUST_BE_USD', HttpStatus.UNPROCESSABLE_ENTITY],
      ['PURCHASE_NOT_FOUND', HttpStatus.NOT_FOUND],
      ['UNSUPPORTED_EXCHANGE_RATE_CURRENCY', HttpStatus.UNPROCESSABLE_ENTITY],
      ['NO_VALID_EXCHANGE_RATE', HttpStatus.UNPROCESSABLE_ENTITY],
    ],
  );

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = this.resolveHttpStatus(exception);

    this.logException(exception, status);

    response.status(status).json({
      statusCode: status,
      error: this.resolveHttpStatusText(status),
      code: exception.code,
      message: exception.message,
    });
  }

  private resolveHttpStatus(error: DomainError): HttpStatus {
    return (
      DomainErrorExceptionFilter.STATUS_MAP.get(error.code) ??
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  private resolveHttpStatusText(status: HttpStatus): string {
    const STATUS_TEXTS: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };

    return STATUS_TEXTS[status] ?? 'Unknown Error';
  }

  private logException(exception: DomainError, status: HttpStatus): void {
    const context = `${exception.code} → ${status}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unmapped DomainError — ${context}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.warn(`${context}: ${exception.message}`);
    }
  }
}
