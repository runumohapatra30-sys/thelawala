import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Building2, ChevronDown, CreditCard, LoaderCircle, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadCashfreeSdk, type CashfreeElement, type CashfreeResult, type CashfreeSdk } from '@/lib/cashfreeSdk';
import { PAYMENT_BANKS } from '@/lib/paymentBanks';

type Props = { totalAmount: number; paymentSessionId: string; onSuccess: (result: CashfreeResult) => void; onCancel?: () => void; isProduction?: boolean };
const METHODS = [
  { id: 'upi', title: 'UPI', Icon: Smartphone },
  { id: 'qr', title: 'Scan & Pay', Icon: QrCode },
  { id: 'card', title: 'Credit / Debit / ATM Card', Icon: CreditCard },
  { id: 'netbanking', title: 'Net Banking', Icon: Building2 },
] as const;

export function ThelaWalaPaymentScreen({ totalAmount, paymentSessionId, onSuccess, onCancel, isProduction = false }: Props) {
  const [active, setActive] = useState('upi');
  const [bank, setBank] = useState('SBINR');
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sdk = useRef<CashfreeSdk | null>(null);
  const payable = useRef<CashfreeElement | null>(null);
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadCashfreeSdk().then(factory => { if (!cancelled) { sdk.current = factory({ mode: isProduction ? 'production' : 'sandbox' }); setReady(true); } }).catch(() => setError('Payment could not load. Please try again.'));
    return () => { cancelled = true; };
  }, [isProduction]);

  useEffect(() => {
    const currentSdk = sdk.current;
    const container = mount.current;
    if (!ready || !currentSdk || !container) return;
    container.replaceChildren();
    payable.current = null;
    const elements: CashfreeElement[] = [];
    function add(type: string, values?: Record<string, string | boolean | number>, label?: string) {
      if (!container || !currentSdk) return;
      const row = document.createElement('div'); row.className = 'payment-secure-field';
      if (label) { const text = document.createElement('p'); text.textContent = label; text.className = 'mb-2 text-xs font-semibold'; row.append(text); }
      const host = document.createElement('div'); row.append(host); container.append(row);
      const element = currentSdk.create(type, values ? { values } : {});
      element.on('loaderror', () => setError('This option is unavailable here. Use Other payment options below.'));
      element.mount(host); elements.push(element); return element;
    }
    if (active === 'upi') {
      for (const [id, name] of [['gpay', 'Google Pay'], ['phonepe', 'PhonePe'], ['paytm', 'Paytm'], ['default', 'Other UPI apps']] as const) {
        const element = add('upiApp', { upiApp: id, buttonText: name, buttonIcon: true });
        element?.on('click', () => { void pay(element); });
      }
      payable.current = add('upiCollect', { placeholder: 'Enter your UPI ID' }, 'Pay with UPI ID') ?? null;
    } else if (active === 'card') {
      payable.current = add('cardNumber', undefined, 'Card number') ?? null;
      add('cardExpiry', undefined, 'Valid thru'); add('cardCvv', undefined, 'CVV'); add('cardHolder', undefined, 'Name on card');
    } else if (active === 'netbanking') {
      payable.current = add('netbanking', { netbankingBankName: bank, buttonText: 'Pay with selected bank', buttonIcon: true }) ?? null;
      const element = payable.current;
      element?.on('click', () => { void pay(element); });
    } else { payable.current = add('upiQr', { size: 220 }) ?? null; }
    return () => { for (const element of elements) element.unmount?.(); container.replaceChildren(); };
  }, [active, bank, ready]);

  async function pay(element: CashfreeElement | null) {
    if (!sdk.current || !element || busy) return;
    setBusy(true); setError('');
    try {
      const result = await sdk.current.pay({ paymentSessionId, paymentMethod: element, redirectTarget: '_modal' });
      if (result.error) { setError(result.error.message ?? 'Payment was not completed.'); return; }
      onSuccess(result);
    } catch { setError('Payment was not completed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function otherOptions() {
    if (!sdk.current || busy) return;
    setBusy(true);
    try { onSuccess(await sdk.current.checkout({ paymentSessionId, redirectTarget: '_modal' })); }
    catch { setError('Payment was not completed. Please try again.'); }
    finally { setBusy(false); }
  }
  const banks = PAYMENT_BANKS.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  return <div role="dialog" aria-modal="true" aria-label="Online payment" className="payment-dialog fixed inset-0 z-[150] overflow-y-auto bg-background text-foreground">
    <div className="mx-auto max-w-[520px] px-4 pb-10">
      <header className="flex items-center gap-3 py-5">
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={busy} aria-label="Back to checkout"><ArrowLeft /></Button>
        <div className="flex-1"><p className="text-xs text-muted-foreground">Step 3 of 3</p><h1 className="text-xl font-extrabold">Payments</h1></div>
        <span className="flex items-center gap-1 rounded-md bg-muted p-2 text-[10px] font-bold"><ShieldCheck className="h-4 w-4" /> Secure</span>
      </header>
      <div className="mb-5 flex justify-between rounded-lg bg-brand-soft p-4 font-bold text-primary"><span>Total Amount</span><span>₹{totalAmount.toFixed(2)}</span></div>
      <div className="space-y-3">{METHODS.map(({ id, title, Icon }) => <section key={id} className="overflow-hidden rounded-lg border border-border bg-card">
        <Button variant="ghost" disabled={busy} aria-expanded={active === id} className="h-auto w-full justify-start p-4 text-left" onClick={() => { setActive(id); setError(''); }}><Icon /><span className="flex-1 font-bold">{title}</span><ChevronDown className={active === id ? 'rotate-180' : ''} /></Button>
        {active === id && <div className="space-y-3 border-t border-border bg-muted/50 p-4">
          {id === 'netbanking' && <><div className="grid grid-cols-4 gap-2">{[['SBINR', 'SBI'], ['HDFCR', 'HDFC'], ['ICICR', 'ICICI'], ['UTIBR', 'Axis']].map(([code, name]) => <Button key={code} variant={bank === code ? 'default' : 'outline'} className="h-auto flex-col px-1 py-3 text-[10px]" onClick={() => setBank(code)}><Building2 />{name}</Button>)}</div><input aria-label="Search banks" placeholder="Search your bank" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-lg border border-input bg-background p-3 text-sm" /><select aria-label="Choose bank" value={bank} onChange={e => setBank(e.target.value)} className="w-full rounded-lg border border-input bg-background p-3 text-sm">{banks.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></>}
          {!ready && <LoaderCircle className="mx-auto animate-spin text-primary" />}
          <div ref={mount} className="space-y-3" />
          {(id === 'card' || id === 'upi' || id === 'qr') && <Button className="w-full" disabled={!ready || busy} onClick={() => void pay(payable.current)}>{busy ? 'Payment in progress…' : `Pay ₹${totalAmount.toFixed(2)}`}</Button>}
        </div>}
      </section>)}</div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <Button variant="outline" className="mt-5 w-full" disabled={!ready || busy} onClick={() => void otherOptions()}>Other payment options</Button>
    </div>
  </div>;
}
