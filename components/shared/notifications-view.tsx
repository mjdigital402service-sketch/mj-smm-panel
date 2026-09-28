import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkAllReadButton } from './mark-all-read-button';

export async function NotificationsView() {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Notifications {unread > 0 && <Badge className="ml-2">{unread} unread</Badge>}</CardTitle>
        {unread > 0 && <MarkAllReadButton />}
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {items.map((n) => (
          <div key={n.id} className={`py-3 ${n.isRead ? 'opacity-60' : ''}`}>
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.message}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{n.createdAt.toLocaleString()}</p>
          </div>
        ))}
        {items.length === 0 && <p className="py-8 text-center text-muted-foreground">You're all caught up.</p>}
      </CardContent>
    </Card>
  );
}
