import { prisma } from '@/lib/prisma';

export interface PlatformSettings {
  distributorCanSetRetailerPricing: boolean;
  maxRetailerMarkupPercent: number;
  lowBalanceThreshold: number;
  registrationOpen: boolean;
  maintenanceMode: boolean;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  distributorCanSetRetailerPricing: true,
  maxRetailerMarkupPercent: 50,
  lowBalanceThreshold: 100,
  registrationOpen: false,
  maintenanceMode: false,
};

const KEY = 'platform.settings';

export async function getSettings(): Promise<PlatformSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<PlatformSettings>) ?? {}) };
}

export async function saveSettings(next: PlatformSettings) {
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: next as any }, update: { value: next as any } });
}
