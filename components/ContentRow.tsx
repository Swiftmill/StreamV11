'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { Movie, Series } from '@/types';

interface ContentRowProps {
  title: string;
  items: (Movie | Series)[];
  type: 'movie' | 'series';
}

export function ContentRow({ title, items, type }: ContentRowProps) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
        {items.map((item, index) => (
          <motion.article
            key={'id' in item ? item.id : item.slug}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            style={{
              background: '#111',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <Link
              href={
                type === 'movie'
                  ? `/title/movies/${encodeURIComponent((item as Movie).id)}`
                  : `/title/series/${encodeURIComponent((item as Series).slug)}`
              }
              style={{ display: 'block', height: '100%' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                <Image
                  src={item.posterUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1rem' }}>{item.title}</strong>
                {'releaseYear' in item && (
                  <span style={{ color: '#9a9a9a', fontSize: '0.85rem' }}>{item.releaseYear}</span>
                )}
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
