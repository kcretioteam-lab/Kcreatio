// Next issue date for a recurring invoice: same day next month / quarter (clamped to month end)
export function nextRecurringDate(fromIso: string, recurring: 'monthly' | 'quarterly'): string {
  const d = new Date(fromIso + 'T00:00:00Z');
  const months = recurring === 'monthly' ? 1 : 3;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}
