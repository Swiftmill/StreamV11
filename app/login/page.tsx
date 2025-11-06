'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { login, useSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isLoading } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/app');
    }
  }, [session, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.replace('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} aria-hidden />
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(20, 20, 20, 0.85)',
          padding: '2rem',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 50px rgba(0,0,0,0.6)'
        }}
      >
        <h1 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: 700 }}>Bienvenue sur StreamV11</h1>
        <p style={{ marginBottom: '2rem', color: '#b3b3b3' }}>
          Connectez-vous pour retrouver vos films, séries et reprendre votre lecture.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>Nom d&apos;utilisateur</span>
            <input
              required
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid #2a2a2a',
                background: '#141414',
                color: 'inherit'
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>Mot de passe</span>
            <input
              required
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid #2a2a2a',
                background: '#141414',
                color: 'inherit'
              }}
            />
          </label>
          {error && (
            <div role="alert" style={{ color: '#ff6b6b' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: loading ? '#a00a12' : 'var(--accent)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </motion.section>
    </main>
  );
}
