import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { AppConfig } from '../../shared/config/app-config';
import { correlationIdStorage } from './correlation-id.storage';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger = pino({
    level: AppConfig.nodeEnv === 'production' ? 'info' : 'debug',
    transport:
      AppConfig.nodeEnv !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });

  private getContextAndParams(optionalParams: unknown[]): {
    context?: string;
    extra?: unknown;
  } {
    let context: string | undefined;
    let extra: unknown;

    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (typeof lastParam === 'string') {
        context = lastParam;
        if (optionalParams.length > 1) {
          extra = optionalParams.slice(0, -1);
        }
      } else {
        extra = optionalParams;
      }
    }

    return { context, extra };
  }

  private buildLogPayload(message: unknown, optionalParams: unknown[]) {
    const correlationId = correlationIdStorage.getStore();
    const { context, extra } = this.getContextAndParams(optionalParams);

    const payload: Record<string, unknown> = {};
    if (correlationId) payload.correlationId = correlationId;
    if (context) payload.context = context;

    if (extra !== undefined) {
      if (Array.isArray(extra) && extra.length === 1) {
        payload.extra = extra[0];
      } else {
        payload.extra = extra;
      }
    }

    if (message instanceof Error) {
      const { message: errMsg, stack, ...rest } = message;
      payload.err = {
        message: errMsg,
        stack,
        ...rest,
      };
      return { payload, message: errMsg };
    }

    if (typeof message === 'object' && message !== null) {
      return { payload: { ...payload, ...message } };
    }

    return { payload, message };
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined && typeof data.message === 'string') {
      this.logger.info(data.payload, data.message);
    } else {
      this.logger.info(data.payload);
    }
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined && typeof data.message === 'string') {
      this.logger.error(data.payload, data.message);
    } else {
      this.logger.error(data.payload);
    }
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined && typeof data.message === 'string') {
      this.logger.warn(data.payload, data.message);
    } else {
      this.logger.warn(data.payload);
    }
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined && typeof data.message === 'string') {
      this.logger.debug(data.payload, data.message);
    } else {
      this.logger.debug(data.payload);
    }
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined && typeof data.message === 'string') {
      this.logger.trace(data.payload, data.message);
    } else {
      this.logger.trace(data.payload);
    }
  }
}
