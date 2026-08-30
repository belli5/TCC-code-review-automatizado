import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, PrismaTransactionClient } from '../prisma/prisma.service';
import { splitInstallments } from '../common/money';
import { PaymentDto } from './dto/create-payment.dto';
import { PaymentView } from './payment.entity';
import {
  DECLINE_MESSAGES,
  DeclineReason,
  PaymentMethod,
  PaymentStatus,
  authorizeCard,
  isAsynchronousMethod,
  isValidInstallmentCount,
} from './gateway/fake-gateway';
import { boletoDueDate, buildBoleto } from './gateway/boleto';
import { buildPixPayload, pixExpiration } from './gateway/pix';

export interface PaymentRecord {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amountCents: number;
  installments: number;
  cardBrand: string | null;
  cardLast4: string | null;
  cardHolderName: string | null;
  pixCode: string | null;
  pixExpiresAt: Date | null;
  boletoDigitableLine: string | null;
  boletoDueDate: Date | null;
  declineReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CreatePaymentResult {
  payment: PaymentRecord;
  approved: boolean;
  message: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForOrder(
    db: PrismaTransactionClient,
    input: {
      orderId: string;
      orderNumber: string;
      amountCents: number;
      payment: PaymentDto;
    },
    now: Date = new Date(),
  ): Promise<CreatePaymentResult> {
    const { orderId, orderNumber, amountCents, payment } = input;
    const method = payment.method;
    const installments = method === 'credit_card' ? (payment.installments ?? 1) : 1;

    if (method === 'credit_card') {
      return this.createCardPayment(db, {
        orderId,
        amountCents,
        installments,
        payment,
        now,
      });
    }

    if (method === 'pix') {
      const expiresAt = pixExpiration(now);
      const record = await db.payment.create({
        data: {
          orderId,
          method,
          status: 'pending',
          amountCents,
          installments: 1,
          pixCode: buildPixPayload({ amountCents, txid: orderNumber }),
          pixExpiresAt: expiresAt,
        },
      });
      return {
        payment: record,
        approved: false,
        message: 'PIX gerado. Pague com o QR Code para liberar o pedido.',
      };
    }

    const dueDate = boletoDueDate(now);
    const boleto = buildBoleto({ amountCents, dueDate, documentNumber: orderNumber });
    const record = await db.payment.create({
      data: {
        orderId,
        method,
        status: 'pending',
        amountCents,
        installments: 1,
        boletoDigitableLine: boleto.digitableLine,
        boletoDueDate: dueDate,
      },
    });
    return {
      payment: record,
      approved: false,
      message: 'Boleto gerado. A compensação leva até 2 dias úteis.',
    };
  }

  private async createCardPayment(
    db: PrismaTransactionClient,
    input: {
      orderId: string;
      amountCents: number;
      installments: number;
      payment: PaymentDto;
      now: Date;
    },
  ): Promise<CreatePaymentResult> {
    const { orderId, amountCents, installments, payment, now } = input;

    if (!payment.card) {
      throw new BadRequestException('Informe os dados do cartão.');
    }
    if (!isValidInstallmentCount(amountCents, installments)) {
      throw new BadRequestException(
        'Número de parcelas indisponível para este valor. Escolha menos parcelas.',
      );
    }

    const authorization = authorizeCard(payment.card, now);

    const record = await db.payment.create({
      data: {
        orderId,
        method: 'credit_card',
        status: authorization.approved ? 'paid' : 'declined',
        amountCents,
        installments,
        cardBrand: authorization.brand,
        cardLast4: authorization.last4,
        cardHolderName: authorization.holderName,
        declineReason: authorization.declineReason,
        paidAt: authorization.approved ? now : null,
      },
    });

    return {
      payment: record,
      approved: authorization.approved,
      message: authorization.message,
    };
  }

  async confirm(paymentId: string, now: Date = new Date()): Promise<PaymentRecord> {
    const payment = await this.findById(paymentId);

    if (payment.status === 'paid') {
      return payment;
    }
    if (!isAsynchronousMethod(payment.method as PaymentMethod)) {
      throw new BadRequestException(
        'Só pagamentos por PIX ou boleto são confirmados por webhook.',
      );
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException('Este pagamento não está mais aguardando confirmação.');
    }
    if (this.isExpired(payment, now)) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Este pagamento expirou. Refaça o pedido.');
    }

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'paid', paidAt: now },
    });
  }

  async findById(paymentId: string): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException(`Pagamento ${paymentId} não encontrado.`);
    }
    return payment;
  }

  async findByOrderId(orderId: string): Promise<PaymentRecord | null> {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }

  async markAs(paymentId: string, status: PaymentStatus): Promise<PaymentRecord> {
    return this.prisma.payment.update({ where: { id: paymentId }, data: { status } });
  }

  isExpired(payment: PaymentRecord, now: Date = new Date()): boolean {
    const deadline = payment.pixExpiresAt ?? payment.boletoDueDate;
    return Boolean(deadline && deadline.getTime() <= now.getTime());
  }

  toView(payment: PaymentRecord, now: Date = new Date()): PaymentView {
    const method = payment.method as PaymentMethod;
    const [firstInstallment] = splitInstallments(payment.amountCents, payment.installments || 1);
    const declineReason = (payment.declineReason as DeclineReason | null) ?? null;

    return {
      id: payment.id,
      orderId: payment.orderId,
      method,
      status: payment.status as PaymentStatus,
      amountCents: payment.amountCents,
      installments: payment.installments,
      installmentCents: firstInstallment,
      card: payment.cardLast4
        ? {
            brand: payment.cardBrand ?? 'unknown',
            last4: payment.cardLast4,
            holderName: payment.cardHolderName ?? '',
          }
        : null,
      pix: payment.pixCode
        ? {
            code: payment.pixCode,
            expiresAt: (payment.pixExpiresAt ?? now).toISOString(),
            expired: payment.status === 'pending' && this.isExpired(payment, now),
          }
        : null,
      boleto: payment.boletoDigitableLine
        ? {
            digitableLine: payment.boletoDigitableLine,
            dueDate: (payment.boletoDueDate ?? now).toISOString(),
          }
        : null,
      declineReason,
      declineMessage: declineReason ? DECLINE_MESSAGES[declineReason] : null,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
