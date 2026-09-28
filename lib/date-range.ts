export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': '7 Days',
  '30d': '30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom Range',
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function resolveRange(key: string | undefined, from?: string, to?: string): { key: RangeKey; start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + 86400000);

  switch (key) {
    case 'today':
      return { key: 'today', start: today, end: tomorrow };
    case 'yesterday':
      return { key: 'yesterday', start: new Date(today.getTime() - 86400000), end: today };
    case '7d':
      return { key: '7d', start: new Date(today.getTime() - 6 * 86400000), end: tomorrow };
    case 'this_month':
      return { key: 'this_month', start: new Date(now.getFullYear(), now.getMonth(), 1), end: tomorrow };
    case 'last_month':
      return { key: 'last_month', start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
    case 'custom': {
      const s = from ? startOfDay(new Date(from)) : new Date(today.getTime() - 29 * 86400000);
      const e = to ? new Date(startOfDay(new Date(to)).getTime() + 86400000) : tomorrow;
      if (isNaN(s.getTime()) || isNaN(e.getTime())) break;
      return { key: 'custom', start: s, end: e };
    }
    default:
      break;
  }
  return { key: '30d', start: new Date(today.getTime() - 29 * 86400000), end: tomorrow };
}
