'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Movie } from '@/types';

interface HeroBannerProps {
  movie: Movie;
}

export function HeroBanner({ movie }: HeroBannerProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        minHeight: '60vh',
        marginBottom: '3rem',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 30%, rgba(10,10,10,0.8) 100%)'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          style={{ objectFit: 'cover' }}
          sizes="100vw"
          priority
        />
      </div>
      <div
        style={{
          position: 'relative',
          padding: '4rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          maxWidth: '40rem'
        }}
      >
        <span style={{ color: '#b3b3b3', fontWeight: 600 }}>À ne pas manquer</span>
        <h2 style={{ fontSize: '3rem', margin: 0 }}>{movie.title}</h2>
        <p style={{ lineHeight: 1.6, color: '#d0d0d0' }}>{movie.description}</p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link
            href={`/watch?type=movie&id=${encodeURIComponent(movie.id)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.9rem 1.5rem',
              borderRadius: 'var(--radius)',
              background: 'var(--accent)',
              fontWeight: 700,
              color: 'white'
            }}
          >
            ▶ Regarder
          </Link>
          <Link
            href={`/title/movies/${movie.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.9rem 1.5rem',
              borderRadius: 'var(--radius)',
              background: 'rgba(255,255,255,0.1)',
              fontWeight: 600
            }}
          >
            Plus d&apos;infos
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
