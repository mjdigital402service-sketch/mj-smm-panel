import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { adminNav } from '@/components/layout/nav-config';
import { getUnreadCount } from '@/server/services/notification.service';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.status !== 'ACTIVE') redirect('/login');
  if (user.role !== 'ADMIN') redirect('/login');

  const unread = await getUnreadCount(user.id);

  return (
    <div className="flex min-h-screen">
      <Sidebar items={adminNav} roleLabel="Admin Panel" />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar userName={user.name} unreadCount={unread} />
        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
