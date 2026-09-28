export const BRAND = {
  name: 'MJ DIGITAL SERVICE',
  shortName: 'MJ',
  tagline: 'Professional Digital & SMM Solutions',

  logo: '/logo/mj-logo.png',

  supportPhone: '9382762161',
  whatsappNumber: '919382762161',

  supportEmail: '',

  logoLetter: 'MJ',

  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },

  legalName: 'MJ DIGITAL SERVICE',

  domain: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat(BRAND.currency.locale, {
    style: 'currency',
    currency: BRAND.currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}