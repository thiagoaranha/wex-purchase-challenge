import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .then((response) => {
        expect(response.body).toHaveProperty('status', 'up');
        expect(response.body).toHaveProperty('app', 'wex-purchase-api-node');
      });
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .then((response) => {
        expect(response.body).toHaveProperty('status', 'up');
        expect(response.body).toHaveProperty('app', 'wex-purchase-api-node');
      });
  });

  it('/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .then((response) => {
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body.details).toHaveProperty('database');
        expect(response.body.details.database).toHaveProperty('status', 'up');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
