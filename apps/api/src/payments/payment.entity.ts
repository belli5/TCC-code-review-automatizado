import { DeclineReason, PaymentMethod, PaymentStatus } from './gateway/fake-gateway';

export interface PaymentCardView {
  brand: string;
  last4: string;
  holderName: string;
}

export interface PaymentPixView {
  code: string;
  expiresAt: string;
  expired: boolean;
}

export interface PaymentBoletoView {
  digitableLine: string;
  dueDate: string;
}

export interface PaymentView {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  installments: number;
  installmentCents: number;
  card: PaymentCardView | null;
  pix: PaymentPixView | null;
  boleto: PaymentBoletoView | null;
  declineReason: DeclineReason | null;
  declineMessage: string | null;
  paidAt: string | null;
  createdAt: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: 'Cartão de crédito',
  pix: 'PIX',
  boleto: 'Boleto bancário',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  declined: 'Recusado',
  refunded: 'Estornado',
  expired: 'Expirado',
};
