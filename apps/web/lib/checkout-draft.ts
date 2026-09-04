
const KEY = 'ecommerce-checkout-draft';

export interface CheckoutDraft {
  zipCode?: string;
  couponCode?: string;
  shippingServiceId?: string;
}

export function saveDraft(patch: CheckoutDraft): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify({ ...loadDraft(), ...patch }));
}

export function loadDraft(): CheckoutDraft {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
