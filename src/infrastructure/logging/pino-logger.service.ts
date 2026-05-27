import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { AppConfig } from '../../shared/config/app-config';
import { correlationIdStorage } from './correlation-id.storage';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger = pino({
    level: AppConfig.nodeEnv === 'production' ? 'info' : 'debug',
    transport: AppConfig.nodeEnv !== 'production'
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

  private getContextAndParams(optionalParams: any[]): { context?: string; extra?: any } {
    let context: string | undefined;
    let extra: any;

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

  private buildLogPayload(message: any, optionalParams: any[]) {
    const correlationId = correlationIdStorage.getStore();
    const { context, extra } = this.getContextAndParams(optionalParams);
    
    const payload: any = {};
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

  log(message: any, ...optionalParams: any[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined) {
      this.logger.info(data.payload, data.message);
    } else {
      this.logger.info(data.payload);
    }
  }

  error(message: any, ...optionalParams: any[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined) {
      this.logger.error(data.payload, data.message);
    } else {
      this.logger.error(data.payload);
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined) {
      this.logger.warn(data.payload, data.message);
    } else {
      this.logger.warn(data.payload);
    }
  }

  debug(message: any, ...optionalParams: any[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined) {
      this.logger.debug(data.payload, data.message);
    } else {
      this.logger.debug(data.payload);
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    const data = this.buildLogPayload(message, optionalParams);
    if (data.message !== undefined) {
      this.logger.trace(data.payload, data.message);
    } else {
      this.logger.trace(data.payload);
    }
  }
}
