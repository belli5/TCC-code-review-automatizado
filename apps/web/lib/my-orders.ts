
const ORDERS_KEY = 'ecommerce-my-orders';
const EMAIL_KEY = 'ecommerce-my-email';

export function rememberOrder(orderId: string, email: string): void {
  if (typeof window === 'undefined') return;
  const current = listRememberedOrders();
  const next = [orderId, ...current.filter((id) => id !== orderId)].slice(0, 50);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  localStorage.setItem(EMAIL_KEY, email);
}

export function listRememberedOrders(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberedEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(EMAIL_KEY) ?? '';
}
