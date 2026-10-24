export type CashfreeResult = { error?: { message?: string }; paymentDetails?: { paymentMessage?: string } };
export type CashfreeElement = {
  mount: (target: string | HTMLElement) => void;
  unmount?: () => void;
  on: (event: string, callback: (data: { error?: { message?: string } }) => void) => void;
};
export type CashfreeSdk = {
  create: (type: string, options?: { values?: Record<string, string | boolean | number> }) => CashfreeElement;
  pay: (opts: { paymentSessionId: string; paymentMethod: CashfreeElement; redirectTarget?: string }) => Promise<CashfreeResult>;
  checkout: (opts: { paymentSessionId: string; redirectTarget?: string | HTMLElement }) => Promise<CashfreeResult>;
};
declare global { interface Window { Cashfree?: (opts: { mode: 'production' | 'sandbox' }) => CashfreeSdk } }
let sdkLoading: Promise<void> | undefined;
export async function loadCashfreeSdk(): Promise<NonNullable<Window['Cashfree']>> {
  if (window.Cashfree) return window.Cashfree;
  sdkLoading ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    el.onload = () => resolve();
    el.onerror = () => { sdkLoading = undefined; reject(new Error('Payment could not load. Please try again.')); };
    document.head.appendChild(el);
  });
  await sdkLoading;
  if (!window.Cashfree) throw new Error('Payment could not load. Please try again.');
  return window.Cashfree;
}
