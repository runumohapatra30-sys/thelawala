import { describe, expect, it } from 'vitest';
import { confirmedPayment } from './paymentOutcome';
describe('online order placement', () => {
  it('accepts only confirmed success for the full amount', () => {
    expect(confirmedPayment('SUCCESS', 120, 120)).toBe(true);
    expect(confirmedPayment('SUCCESS', 100, 120)).toBe(false);
  });
  it('never confirms pending, failed or cancelled payment', () => {
    for (const status of ['PENDING', 'FAILED', 'CANCELLED']) expect(confirmedPayment(status, 120, 120)).toBe(false);
  });
});
