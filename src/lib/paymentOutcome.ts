export function confirmedPayment(status: string, actualAmount: number, expectedAmount: number): boolean {
  return status === 'SUCCESS' && Math.round(actualAmount * 100) === Math.round(expectedAmount * 100);
}
