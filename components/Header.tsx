'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, logout } from '@/lib/api';
import { useMemo } from 'react';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const links = useMemo(
    () => [
      { href: '/app', label: 'Accueil' },
      { href: '/app/movies', label: 'Films' },
      { href: '/app/series', label: 'Séries' }
    ],
    []
  );

  async function handleLogout() {
    if (!session) return;
    await logout(session.csrfToken);
    router.replace('/login');
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(10, 10, 10, 0.75)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem'
      }}
    >
      <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link href="/app" style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent)' }}>
          StreamV11
        </Link>
        <ul style={{ display: 'flex', listStyle: 'none', gap: '1rem', margin: 0, padding: 0 }}>
          {links.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                style={{
                  fontWeight: pathname === link.href ? 700 : 500,
                  color: pathname === link.href ? 'white' : '#b3b3b3'
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
          {session?.role === 'admin' && (
            <li>
              <Link href="/admin" style={{ fontWeight: pathname?.startsWith('/admin') ? 700 : 500 }}>
                Admin
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {session && <span style={{ color: '#b3b3b3' }}>Connecté en tant que {session.username}</span>}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '999px',
            border: 'none',
            background: '#1f1f1f',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
