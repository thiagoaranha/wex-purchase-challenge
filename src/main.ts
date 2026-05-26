import './shared/config/env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { AppConfig } from './shared/config/app-config';
import { HttpExceptionFilter } from './interfaces/http/filters/http-exception.filter';

const MAX_PAYLOAD_SIZE = '10kb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security headers ──────────────────────────────────────────────────────
  // Helmet sets sensible HTTP response headers (XSS, MIME-sniffing, HSTS,
  // Clickjacking, etc.). CSP is relaxed only for the Swagger UI route so the
  // interactive docs remain functional in non-production environments.
  app.use(
    helmet({
      contentSecurityPolicy: AppConfig.nodeEnv === 'production' ? undefined : false,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  // Only origins declared in CORS_ALLOWED_ORIGINS are allowed. Restricting
  // methods to the subset actually exposed by this API further reduces surface.
  app.enableCors({
    origin: AppConfig.corsAllowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });

  // ── Payload size limit ────────────────────────────────────────────────────
  // Reject request bodies larger than 10 kb before any handler runs.
  // Protects against degenerate payloads and simple DoS attempts.
  app.use(json({ limit: MAX_PAYLOAD_SIZE }));

  // ── Global pipes ──────────────────────────────────────────────────────────
  // whitelist: strips unknown properties from the request body.
  // transform: auto-coerces primitive types declared in DTOs.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ── Global exception filter ───────────────────────────────────────────────
  // Provides a consistent error shape and strips stack traces in production.
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('WEX Purchase API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(AppConfig.port);
}

void bootstrap();

