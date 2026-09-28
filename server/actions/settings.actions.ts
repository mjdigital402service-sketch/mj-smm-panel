'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { saveSettings } from '@/server/services/settings.service';
import { recordAudit } from '@/server/services/audit.service';

const schema = z.object({
  distributorCanSetRetailerPricing: z.boolean(),
  maxRetailerMarkupPercent: z.coerce.number().min(0).max(1000),
  lowBalanceThreshold: z.coerce.number().min(0),
  registrationOpen: z.boolean(),
  maintenanceMode: z.boolean(),
});

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireUser(['ADMIN']);
  const parsed = schema.parse({
    distributorCanSetRetailerPricing: formData.get('distributorCanSetRetailerPricing') === 'on',
    maxRetailerMarkupPercent: formData.get('maxRetailerMarkupPercent'),
    lowBalanceThreshold: formData.get('lowBalanceThreshold'),
    registrationOpen: formData.get('registrationOpen') === 'on',
    maintenanceMode: formData.get('maintenanceMode') === 'on',
  });
  await saveSettings(parsed);
  await recordAudit({ actorId: admin.id, action: 'UPDATE_SETTINGS', entityType: 'SystemSetting', metadata: parsed });
  revalidatePath('/admin/settings');
}
