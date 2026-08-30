import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products deve retornar a lista de produtos', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /products/:id deve retornar um produto existente', async () => {
    const res = await request(app.getHttpServer()).get('/products/1').expect(200);
    expect(res.body.id).toBe('1');
  });

  it('GET /products/:id deve retornar 404 para produto inexistente', async () => {
    await request(app.getHttpServer()).get('/products/id-invalido').expect(404);
  });

  it('POST /orders deve criar um pedido e retornar o total correto', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({
        customerName: 'Gabriel',
        customerEmail: 'gabriel@teste.com',
        items: [{ productId: '1', name: 'Camiseta', price: 59.9, quantity: 2 }],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.total).toBeCloseTo(119.8);
  });

  it('GET /orders deve listar os pedidos criados', async () => {
    const res = await request(app.getHttpServer()).get('/orders').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});