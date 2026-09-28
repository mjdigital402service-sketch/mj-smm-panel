import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user || user.status !== 'ACTIVE') redirect('/login');
  redirect(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'DISTRIBUTOR' ? '/distributor/dashboard' : '/retailer/dashboard');
}
