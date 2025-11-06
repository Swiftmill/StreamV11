import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { AdminDashboard } from '@/components/AdminDashboard';
import { getServerSession } from '@/lib/serverApi';

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session || session.role !== 'admin') {
    redirect('/app');
  }

  return (
    <AppShell>
      <AdminDashboard />
    </AppShell>
  );
}
