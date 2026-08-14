import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('deve retornar a lista de produtos', () => {
    const products = service.findAll();
    expect(products.length).toBeGreaterThan(0);
  });

  it('deve retornar um produto pelo id', () => {
    const product = service.findOne('1');
    expect(product).toBeDefined();
    expect(product.id).toBe('1');
  });

  it('deve lançar NotFoundException para id inexistente', () => {
    expect(() => service.findOne('id-invalido')).toThrow(NotFoundException);
  });
});