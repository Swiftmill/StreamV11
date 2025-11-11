'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { AdminDashboard } from '@/components/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();
  const { data, error, isLoading } = useSession();

  // Attendre l’hydratation, sinon Next peut pré-rendre sans cookie
  if (isLoading) return null;

  // Éviter les boucles en cas d’erreur réseau temporaire
  if (error) return <AppShell><div>Erreur réseau.</div></AppShell>;

  if (!data || data.role !== 'admin') {
    router.replace('/app');
    return null;
  }

  return (
    <AppShell>
      <AdminDashboard />
    </AppShell>
  );
}
