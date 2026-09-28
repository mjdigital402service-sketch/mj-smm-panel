'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { markAllRead } from '@/server/services/notification.service';
import { recordAudit } from '@/server/services/audit.service';

export async function markAllReadAction() {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);
  await markAllRead(user.id);
  revalidatePath('/admin/notifications');
  revalidatePath('/distributor/dashboard');
  revalidatePath('/retailer/dashboard');
}

/** Admin-only: broadcast a system announcement to a role group (or everyone). */
export async function broadcastAnnouncementAction(formData: FormData) {
  const admin = await requireUser(['ADMIN']);
  const title = String(formData.get('title') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const audience = String(formData.get('audience') ?? 'ALL');
  if (!title || !message) throw new Error('Title and message are required.');

  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: audience === 'ALL' ? { in: ['DISTRIBUTOR', 'RETAILER'] } : (audience as 'DISTRIBUTOR' | 'RETAILER'),
    },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type: 'SYSTEM_ANNOUNCEMENT' as const, title, message })),
  });
  await recordAudit({ actorId: admin.id, action: 'BROADCAST_ANNOUNCEMENT', entityType: 'Notification', metadata: { audience, recipients: users.length } });
  revalidatePath('/admin/notifications');
}
