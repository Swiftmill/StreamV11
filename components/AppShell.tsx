'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { useSession } from '@/lib/api';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { data: session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [isLoading, session, router]);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="skeleton" style={{ width: 160, height: 160, borderRadius: '50%' }} aria-hidden />
        <span className="sr-only">Chargement</span>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>{children}</main>
    </div>
  );
}
