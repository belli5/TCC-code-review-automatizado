import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';
import { PrismaService, PrismaTransactionClient } from '../prisma/prisma.service';
import { PaymentRecord, PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../coupons/coupons.service';
import { evaluateCoupon } from '../coupons/coupon-rules';
import {
  findShippingOption,
  quoteShipping,
  shippingServiceName,
} from '../shipping/shipping-rules';
import { clampToZero } from '../common/money';
import { normalizeZipCode } from '../common/validators';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  allowedTransitions,
  canCancel,
  nextFulfillmentStep,
} from '../common/order-status';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderView } from './order.entity';

interface CatalogProduct {
  id: string;
  name: string;
  image: string;
  priceCents: number;
  weightGrams: number;
  stock: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly coupons: CouponsService,
  ) {}

  async checkout(dto: CreateOrderDto, now: Date = new Date()): Promise<OrderView> {
    const products = await this.loadProducts(dto);
    const pricing = await this.priceOrder(dto, products, now);
    const number = this.generateOrderNumber(now);

    const orderId = await this.prisma.$transaction(async (tx) => {
      await this.reserveStock(tx, dto, products);

      const order = await tx.order.create({
        data: {
          number,
          status: 'awaiting_payment',
          customerName: dto.customer.name.trim(),
          customerEmail: dto.customer.email.trim().toLowerCase(),
          customerDocument: dto.customer.document?.trim() || null,
          customerPhone: dto.customer.phone?.trim() || null,
          shippingZipCode: normalizeZipCode(dto.address.zipCode),
          shippingStreet: dto.address.street.trim(),
          shippingNumber: dto.address.number.trim(),
          shippingComplement: dto.address.complement?.trim() || null,
          shippingDistrict: dto.address.district.trim(),
          shippingCity: dto.address.city.trim(),
          shippingState: dto.address.state.trim().toUpperCase(),
          shippingService: dto.shippingServiceId,
          shippingEtaDays: pricing.etaDays,
          shippingCents: pricing.shippingCents,
          subtotalCents: pricing.subtotalCents,
          discountCents: pricing.discountCents,
          totalCents: pricing.totalCents,
          couponId: pricing.couponId,
          couponCode: pricing.couponCode,
          items: {
            create: dto.items.map((item) => {
              const product = products.get(item.productId) as CatalogProduct;
              return {
                productId: product.id,
                name: product.name,
                image: product.image,
                unitPriceCents: product.priceCents,
                quantity: item.quantity,
                subtotalCents: product.priceCents * item.quantity,
              };
            }),
          },
        },
      });

      await this.addEvent(tx, order.id, 'awaiting_payment', 'Pedido registrado.', now);

      const result = await this.payments.createForOrder(
        tx,
        {
          orderId: order.id,
          orderNumber: order.number,
          amountCents: pricing.totalCents,
          payment: dto.payment,
        },
        now,
      );

      if (result.approved) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'paid', paidAt: now },
        });
        await this.addEvent(tx, order.id, 'paid', result.message, new Date(now.getTime() + 1));
      } else if (result.payment.status === 'declined') {
        await this.restock(tx, dto);
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'payment_failed' },
        });
        await this.addEvent(
          tx,
          order.id,
          'payment_failed',
          result.message,
          new Date(now.getTime() + 1),
        );
      }

      if (pricing.couponId) {
        await tx.coupon.update({
          where: { id: pricing.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return order.id;
    });

    return this.findOne(orderId);
  }

  async findOne(idOrNumber: string, now: Date = new Date()): Promise<OrderView> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { number: idOrNumber }] },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido "${idOrNumber}" não encontrado.`);
    }

    return this.toView(order, now);
  }

  async findAll(query: QueryOrdersDto, now: Date = new Date()) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.email) where.customerEmail = query.email.trim().toLowerCase();

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, events: { orderBy: { createdAt: 'asc' } }, payment: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.toView(order, now)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async confirmPayment(paymentId: string, now: Date = new Date()): Promise<OrderView> {
    const payment = await this.payments.confirm(paymentId, now);
    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });

    if (!order) {
      throw new NotFoundException('Pedido do pagamento não encontrado.');
    }

    const status = order.status as OrderStatus;
    if (status === 'awaiting_payment') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid', paidAt: now },
      });
      await this.addEvent(
        this.prisma,
        order.id,
        'paid',
        'Pagamento confirmado pelo banco.',
        now,
      );
    }

    return this.findOne(order.id, now);
  }

  async advance(idOrNumber: string, now: Date = new Date()): Promise<OrderView> {
    const order = await this.findRaw(idOrNumber);
    const status = order.status as OrderStatus;
    const next = nextFulfillmentStep(status);

    if (!next) {
      throw new BadRequestException(
        `Não há próximo passo a partir de "${ORDER_STATUS_LABELS[status]}".`,
      );
    }

    const data: Record<string, unknown> = { status: next };
    let note = `Pedido movido para "${ORDER_STATUS_LABELS[next]}".`;

    if (next === 'shipped') {
      const trackingCode = this.generateTrackingCode();
      data.shippedAt = now;
      data.trackingCode = trackingCode;
      note = `Pedido despachado. Código de rastreio: ${trackingCode}.`;
    }
    if (next === 'delivered') {
      data.deliveredAt = now;
      note = 'Entrega concluída.';
    }
    if (next === 'processing') {
      note = 'Pedido em separação no estoque.';
    }

    await this.prisma.order.update({ where: { id: order.id }, data });
    await this.addEvent(this.prisma, order.id, next, note, now);

    return this.findOne(order.id, now);
  }

  async cancel(idOrNumber: string, reason: string | undefined, now: Date = new Date()) {
    const order = await this.findRaw(idOrNumber);
    const status = order.status as OrderStatus;

    if (!canCancel(status)) {
      throw new ConflictException(
        `Um pedido em "${ORDER_STATUS_LABELS[status]}" não pode mais ser cancelado.`,
      );
    }

    const items = await this.prisma.orderItem.findMany({
      where: { orderId: order.id },
      select: { productId: true, quantity: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      const payment = await tx.payment.findUnique({ where: { orderId: order.id } });
      if (payment && payment.status === 'paid') {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
      } else if (payment && payment.status === 'pending') {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'expired' } });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          cancelledAt: now,
          cancelReason: reason?.trim() || 'Cancelado pelo cliente.',
        },
      });

      await this.addEvent(
        tx,
        order.id,
        'cancelled',
        payment?.status === 'paid'
          ? 'Pedido cancelado e pagamento estornado. Estoque devolvido.'
          : 'Pedido cancelado. Estoque devolvido.',
        now,
      );
    });

    return this.findOne(order.id, now);
  }

  private async findRaw(idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { number: idOrNumber }] },
    });
    if (!order) {
      throw new NotFoundException(`Pedido "${idOrNumber}" não encontrado.`);
    }
    return order;
  }

  private async loadProducts(dto: CreateOrderDto): Promise<Map<string, CatalogProduct>> {
    const ids = [...new Set(dto.items.map((item) => item.productId))];

    if (ids.length !== dto.items.length) {
      throw new BadRequestException(
        'O mesmo produto aparece mais de uma vez. Some as quantidades em um único item.',
      );
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, name: true, image: true, priceCents: true, weightGrams: true, stock: true },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException('Algum produto do carrinho não está mais disponível.');
    }

    return new Map(products.map((product) => [product.id, product]));
  }

  private async priceOrder(
    dto: CreateOrderDto,
    products: Map<string, CatalogProduct>,
    now: Date,
  ) {
    let subtotalCents = 0;
    let weightGrams = 0;

    for (const item of dto.items) {
      const product = products.get(item.productId) as CatalogProduct;
      subtotalCents += product.priceCents * item.quantity;
      weightGrams += product.weightGrams * item.quantity;
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discountCents = 0;
    let freeShipping = false;

    const rawCode = dto.couponCode?.trim();
    if (rawCode) {
      const rule = await this.coupons.findRule(rawCode);
      const evaluation = evaluateCoupon(rule, subtotalCents, now);
      if (!evaluation.ok) {
        throw new BadRequestException(evaluation.message);
      }
      couponId = rule.id;
      couponCode = rule.code;
      discountCents = evaluation.discountCents;
      freeShipping = evaluation.freeShipping;
    }

    const quote = quoteShipping({
      zipCode: dto.address.zipCode,
      weightGrams,
      subtotalCents,
      now,
    });
    const option = findShippingOption(quote, dto.shippingServiceId);

    if (!option) {
      throw new BadRequestException('Forma de entrega indisponível para este CEP.');
    }

    const shippingCents = freeShipping ? 0 : option.priceCents;
    const totalCents = clampToZero(subtotalCents - discountCents) + shippingCents;

    return {
      subtotalCents,
      discountCents,
      shippingCents,
      totalCents,
      etaDays: option.etaDays,
      couponId,
      couponCode,
    };
  }

  private async reserveStock(
    tx: PrismaTransactionClient,
    dto: CreateOrderDto,
    products: Map<string, CatalogProduct>,
  ): Promise<void> {
    for (const item of dto.items) {
      const product = products.get(item.productId) as CatalogProduct;
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          `Estoque insuficiente para "${product.name}". Restam ${product.stock} unidade(s).`,
        );
      }
    }
  }

  private async restock(tx: PrismaTransactionClient, dto: CreateOrderDto): Promise<void> {
    for (const item of dto.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  private async addEvent(
    tx: PrismaTransactionClient,
    orderId: string,
    status: OrderStatus,
    note: string,
    at: Date,
  ): Promise<void> {
    await tx.orderEvent.create({ data: { orderId, status, note, createdAt: at } });
  }

  private generateOrderNumber(now: Date): string {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `LS-${year}${month}${day}-${suffix}`;
  }

  private generateTrackingCode(): string {
    const digits = String(randomInt(0, 1_000_000_000)).padStart(9, '0');
    return `BR${digits}LS`;
  }

  private toView(order: OrderRow, now: Date): OrderView {
    const status = order.status as OrderStatus;

    return {
      id: order.id,
      number: order.number,
      status,
      statusLabel: ORDER_STATUS_LABELS[status],
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        document: order.customerDocument,
        phone: order.customerPhone,
      },
      address: {
        zipCode: order.shippingZipCode,
        street: order.shippingStreet,
        number: order.shippingNumber,
        complement: order.shippingComplement,
        district: order.shippingDistrict,
        city: order.shippingCity,
        state: order.shippingState,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        image: item.image,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: item.subtotalCents,
      })),
      coupon: order.couponCode
        ? { code: order.couponCode, discountCents: order.discountCents }
        : null,
      shipping: {
        serviceId: order.shippingService,
        name: shippingServiceName(order.shippingService),
        priceCents: order.shippingCents,
        etaDays: order.shippingEtaDays,
        trackingCode: order.trackingCode,
      },
      totals: {
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
      },
      payment: order.payment ? this.payments.toView(order.payment, now) : null,
      timeline: order.events.map((event) => {
        const eventStatus = event.status as OrderStatus;
        return {
          status: eventStatus,
          statusLabel: ORDER_STATUS_LABELS[eventStatus] ?? event.status,
          note: event.note,
          at: event.createdAt.toISOString(),
        };
      }),
      allowedTransitions: [...allowedTransitions(status)],
      canCancel: canCancel(status),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
      cancelReason: order.cancelReason,
    };
  }
}

interface OrderRow {
  id: string;
  number: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string | null;
  customerPhone: string | null;
  shippingZipCode: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingComplement: string | null;
  shippingDistrict: string;
  shippingCity: string;
  shippingState: string;
  shippingService: string;
  shippingEtaDays: number;
  shippingCents: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  trackingCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  items: {
    id: string;
    productId: string;
    name: string;
    image: string;
    unitPriceCents: number;
    quantity: number;
    subtotalCents: number;
  }[];
  events: { status: string; note: string; createdAt: Date }[];
  payment: PaymentRecord | null;
}
