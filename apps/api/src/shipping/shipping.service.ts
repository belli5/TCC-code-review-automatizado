import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteItemDto, QuoteShippingDto } from './dto/quote-shipping.dto';
import { ShippingQuote, quoteShipping } from './shipping-rules';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(dto: QuoteShippingDto): Promise<ShippingQuote> {
    const { weightGrams, subtotalCents } = await this.measureCart(dto.items);
    return quoteShipping({ zipCode: dto.zipCode, weightGrams, subtotalCents });
  }

  async measureCart(
    items: QuoteItemDto[],
  ): Promise<{ weightGrams: number; subtotalCents: number }> {
    const ids = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, weightGrams: true, priceCents: true },
    });

    const byId = new Map(products.map((product) => [product.id, product]));

    let weightGrams = 0;
    let subtotalCents = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Produto ${item.productId} não existe mais no catálogo.`);
      }
      weightGrams += product.weightGrams * item.quantity;
      subtotalCents += product.priceCents * item.quantity;
    }

    return { weightGrams, subtotalCents };
  }
}
