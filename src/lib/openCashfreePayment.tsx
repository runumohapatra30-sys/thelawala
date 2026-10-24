import { createRoot } from 'react-dom/client';
import { ThelaWalaPaymentScreen } from '@/components/thelawalapaymentscreen';
import type { CashfreeResult } from '@/lib/cashfreeSdk';
export function openCashfreePayment(options: { totalAmount: number; paymentSessionId: string; isProduction: boolean }): Promise<CashfreeResult> {
  return new Promise(resolve => {
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    const finish = (result: CashfreeResult) => { resolve(result); setTimeout(() => { root.unmount(); host.remove(); }, 0); };
    root.render(<ThelaWalaPaymentScreen {...options} onSuccess={finish} onCancel={() => finish({ error: { message: 'Payment cancelled' } })} />);
  });
}
