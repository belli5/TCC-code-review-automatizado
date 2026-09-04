import { PaymentView } from '../payments/payment.entity';
import { OrderStatus } from '../common/order-status';

export interface OrderItemView {
  id: string;
  productId: string;
  name: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface OrderEventView {
  status: OrderStatus;
  statusLabel: string;
  note: string;
  at: string;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

export interface OrderCustomerView {
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
}

export interface OrderAddressView {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
}

export interface OrderShippingView {
  serviceId: string;
  name: string;
  priceCents: number;
  etaDays: number;
  trackingCode: string | null;
}

export interface OrderCouponView {
  code: string;
  discountCents: number;
}

export interface OrderView {
  id: string;
  number: string;
  status: OrderStatus;
  statusLabel: string;
  customer: OrderCustomerView;
  address: OrderAddressView;
  items: OrderItemView[];
  coupon: OrderCouponView | null;
  shipping: OrderShippingView;
  totals: OrderTotals;
  payment: PaymentView | null;
  timeline: OrderEventView[];
  allowedTransitions: OrderStatus[];
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}
