import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isProduction } from '../../../shared/config/app-config';

/**
 * Global exception filter for all HttpExceptions not handled by a more
 * specific filter (e.g. TreasuryUnavailableExceptionFilter).
 *
 * Responsibilities:
 * - Returns a consistent JSON error shape.
 * - Strips internal stack traces from responses in production to avoid
 *   leaking implementation details.
 * - Logs only method, path, status, and message — never the request body
 *   or headers — to prevent PII / secrets from appearing in log output.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    this.logException(exception, request, status);

    const rawResponse = exception.getResponse();
    const safeResponse = this.buildSafeResponse(rawResponse, status);

    response.status(status).json(safeResponse);
  }

  private buildSafeResponse(
    rawResponse: string | object,
    status: number,
  ): object {
    const base: Record<string, unknown> =
      typeof rawResponse === 'string'
        ? { statusCode: status, message: rawResponse }
        : { ...(rawResponse as Record<string, unknown>) };

    // Strip stack traces outside development to avoid leaking internals.
    if (isProduction()) {
      delete base['stack'];
    }

    return base;
  }

  private logException(
    exception: HttpException,
    request: Request,
    status: number,
  ): void {
    // Log only non-sensitive metadata — no body, no headers.
    const context = `${request.method} ${request.path} → ${status}`;

    if (status >= 500) {
      this.logger.error(context, exception.stack);
    } else {
      this.logger.warn(`${context} — ${exception.message}`);
    }
  }
}
