import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  private readonly products: Product[] = [
    {
      id: '1',
      name: 'Camiseta Básica',
      description: 'Camiseta 100% algodão, confortável para o dia a dia.',
      price: 59.9,
      image: 'https://placehold.co/400x400?text=Camiseta',
    },
    {
      id: '2',
      name: 'Tênis Runner',
      description: 'Tênis leve, ideal para caminhadas e corridas curtas.',
      price: 249.9,
      image: 'https://placehold.co/400x400?text=Tenis',
    },
    {
      id: '3',
      name: 'Mochila Urbana',
      description: 'Mochila resistente à água com compartimento para notebook.',
      price: 179.9,
      image: 'https://placehold.co/400x400?text=Mochila',
    },
    {
      id: '4',
      name: 'Garrafa Térmica',
      description: 'Mantém a temperatura por até 12 horas. 500ml.',
      price: 79.9,
      image: 'https://placehold.co/400x400?text=Garrafa',
    },
  ];

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }
    return product;
  }
}
