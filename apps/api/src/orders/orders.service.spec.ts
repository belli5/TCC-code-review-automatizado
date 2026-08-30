import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('deve criar um pedido calculando o total corretamente', () => {
    const order = service.create('Gabriel', 'gabriel@teste.com', [
      { productId: '1', name: 'Camiseta', price: 50, quantity: 2 },
      { productId: '2', name: 'Boné', price: 30, quantity: 1 },
    ]);

    expect(order.id).toBeDefined();
    expect(order.total).toBe(130);
    expect(order.items).toHaveLength(2);
  });

  it('deve listar os pedidos criados', () => {
    service.create('Gabriel', 'gabriel@teste.com', [
      { productId: '1', name: 'Camiseta', price: 50, quantity: 1 },
    ]);

    const orders = service.findAll();
    expect(orders.length).toBeGreaterThan(0);
  });
});