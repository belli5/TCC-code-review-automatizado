
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  discountPercent: number;
  image: string;
  category: string;
  categoryLabel: string;
  stock: number;
  inStock: boolean;
  weightGrams: number;
  rating: number;
  reviewsCount: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductDetail extends Product {
  reviews: Review[];
  ratingBreakdown: Record<string, number>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Category {
  slug: string;
  label: string;
  count: number;
}

export interface CouponApplication {
  code: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  description: string;
  discountCents: number;
  freeShipping: boolean;
}

export interface CouponListItem {
  code: string;
  type: string;
  description: string;
  minSubtotalCents: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  originalPriceCents: number;
  etaDays: number;
  estimatedDeliveryAt: string;
  freeShippingApplied: boolean;
}

export interface ShippingQuote {
  zipCode: string;
  zone: string;
  zoneLabel: string;
  weightGrams: number;
  freeShippingThresholdCents: number;
  missingForFreeShippingCents: number;
  options: ShippingOption[];
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'payment_failed';

export type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'declined' | 'refunded' | 'expired';
  amountCents: number;
  installments: number;
  installmentCents: number;
  card: { brand: string; last4: string; holderName: string } | null;
  pix: { code: string; expiresAt: string; expired: boolean } | null;
  boleto: { digitableLine: string; dueDate: string } | null;
  declineReason: string | null;
  declineMessage: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface OrderEvent {
  status: OrderStatus;
  statusLabel: string;
  note: string;
  at: string;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  statusLabel: string;
  customer: { name: string; email: string; document: string | null; phone: string | null };
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
  };
  items: OrderItem[];
  coupon: { code: string; discountCents: number } | null;
  shipping: {
    serviceId: string;
    name: string;
    priceCents: number;
    etaDays: number;
    trackingCode: string | null;
  };
  totals: {
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    totalCents: number;
  };
  payment: Payment | null;
  timeline: OrderEvent[];
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

export interface TestCard {
  number: string;
  brand: string;
  outcome: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : (raw ?? 'Erro inesperado na API.');
    throw new ApiError(message, response.status);
  }

  return body as T;
}

const get = <T,>(path: string) => request<T>(path);
const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export interface ProductQuery {
  search?: string;
  category?: string;
  sort?: string;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
  minPriceCents?: number;
  maxPriceCents?: number;
}

export function buildProductQuery(query: ProductQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  products: (query: ProductQuery = {}) =>
    get<Paginated<Product>>(`/products${buildProductQuery(query)}`),
  product: (idOrSlug: string) => get<ProductDetail>(`/products/${idOrSlug}`),
  categories: () => get<Category[]>('/products/categories'),
  createReview: (idOrSlug: string, body: { author: string; rating: number; comment: string }) =>
    post<Review>(`/products/${idOrSlug}/reviews`, body),

  coupons: () => get<CouponListItem[]>('/coupons'),
  validateCoupon: (code: string, subtotalCents: number) =>
    post<CouponApplication>('/coupons/validate', { code, subtotalCents }),

  shippingPolicy: () => get<{ freeShippingThresholdCents: number }>('/shipping/policy'),
  quoteShipping: (zipCode: string, items: { productId: string; quantity: number }[]) =>
    post<ShippingQuote>('/shipping/quote', { zipCode, items }),

  checkout: (body: unknown) => post<Order>('/orders', body),
  order: (idOrNumber: string) => get<Order>(`/orders/${idOrNumber}`),
  orders: (query: { email?: string; status?: string; pageSize?: number } = {}) =>
    get<Paginated<Order>>(`/orders${buildProductQuery(query as ProductQuery)}`),
  advanceOrder: (id: string) => post<Order>(`/orders/${id}/advance`),
  cancelOrder: (id: string, reason?: string) => post<Order>(`/orders/${id}/cancel`, { reason }),

  confirmPayment: (paymentId: string) => post<Order>(`/payments/${paymentId}/confirm`),
  testCards: () => get<TestCard[]>('/payments/test-cards'),
};
