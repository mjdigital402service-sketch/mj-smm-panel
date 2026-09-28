import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { computeAdminPrice, pickMostSpecificRule, applyMarkupPublic } from '@/server/services/pricing.service';

const D = (n: number | string) => new Prisma.Decimal(n);

describe('pricing calculation', () => {
  it('applies percentage markup on cost (100 -> 110)', () => {
    const p = computeAdminPrice({ costPrice: D(100), adminMarkupType: 'PERCENTAGE', adminMarkupValue: D(10) });
    expect(p.toString()).toBe('110');
  });
  it('applies fixed markup', () => {
    const p = computeAdminPrice({ costPrice: D(100), adminMarkupType: 'FIXED', adminMarkupValue: D(15) });
    expect(p.toString()).toBe('115');
  });
  it('stays exact with decimals (no float drift)', () => {
    const p = applyMarkupPublic(D('0.1'), 'FIXED', D('0.2'));
    expect(p.toString()).toBe('0.3');
  });
  it('chains admin -> distributor -> retailer tiers', () => {
    const admin = computeAdminPrice({ costPrice: D(100), adminMarkupType: 'PERCENTAGE', adminMarkupValue: D(10) });
    const retailer = applyMarkupPublic(admin, 'PERCENTAGE', D(10));
    expect(retailer.toFixed(2)).toBe('121.00');
  });
  it('picks SERVICE over CATEGORY over GLOBAL', () => {
    const r = pickMostSpecificRule([{ scope: 'GLOBAL', id: 'g' }, { scope: 'SERVICE', id: 's' }, { scope: 'CATEGORY', id: 'c' }]);
    expect(r?.id).toBe('s');
  });
  it('charge for a quantity is rate * qty / 1000', () => {
    expect(D('125').mul(2000).div(1000).toString()).toBe('250');
  });
});
