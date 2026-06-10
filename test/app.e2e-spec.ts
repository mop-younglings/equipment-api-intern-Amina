import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupSwagger } from './../src/config/swagger.config';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  it('bootstraps successfully', () => {
    expect(app).toBeDefined();
  });

  it('/api (GET) serves Swagger UI', () => {
    return request(app.getHttpServer()).get('/api').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
