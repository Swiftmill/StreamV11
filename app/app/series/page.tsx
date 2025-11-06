'use client';

import { AppShell } from '@/components/AppShell';
import { useSeries } from '@/lib/api';
import { ContentRow } from '@/components/ContentRow';

export default function SeriesListingPage() {
  const { data: series, isLoading } = useSeries();

  return (
    <AppShell>
      <section style={{ display: 'grid', gap: '2rem' }}>
        <header>
          <h1 style={{ fontSize: '2.5rem' }}>Toutes les séries</h1>
          <p style={{ color: '#b3b3b3' }}>
            Retrouvez vos séries préférées et découvrez les nouveautés.
          </p>
        </header>
        {isLoading && <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius)' }} />}
        {series && <ContentRow title="Catalogue" items={series} type="series" />}
      </section>
    </AppShell>
  );
}
