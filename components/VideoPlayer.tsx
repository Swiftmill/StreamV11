'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import type { Subtitle } from '@/types';

type PlayerSource = {
  src: string;
  type: 'movie' | 'series';
  poster?: string;
  title: string;
  subtitles: Subtitle[];
  startTime?: number;
};

interface VideoPlayerProps {
  source: PlayerSource;
  onTimeUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
}

export function VideoPlayer({ source, onTimeUpdate, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resetTracks = (v: HTMLVideoElement) => {
      Array.from(v.querySelectorAll('track')).forEach(t => t.remove());
      const tt = v.textTracks;
      for (let i = tt.length - 1; i >= 0; i--) {
        try { tt[i].mode = 'disabled'; } catch {}
      }
    };

    const destroyHls = () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };

    try { video.pause(); } catch {}
    video.removeAttribute('src');
    video.load();
    resetTracks(video);
    destroyHls();

    video.poster = source.poster ?? '';

    if (Hls.isSupported() && source.src.endsWith('.m3u8')) {
      const hls = new Hls({ enableWorker: false, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(source.src);
      hls.attachMedia(video);
    } else {
      video.src = source.src;
    }

    if (Array.isArray(source.subtitles)) {
      source.subtitles.forEach((s, i) => {
        if (!s?.url || !s?.lang) return;
        const track = document.createElement('track');
        track.kind = 'subtitles';
        const label = s.lang.toUpperCase(); // pas de s.label dans ton type
        track.label = label;
        track.srclang = s.lang;
        track.src = s.url;
        if (i === 0) track.default = true;
        video.appendChild(track);
      });
    }

    if (typeof source.startTime === 'number' && source.startTime > 0) {
      try { video.currentTime = source.startTime; } catch {}
    }

    const handleTimeUpdate = () => {
      if (!onTimeUpdate) return;
      const duration = video.duration || 0;
      if (duration > 0) onTimeUpdate(video.currentTime, duration);
    };

    const handleEnded = () => {
      try { video.currentTime = 0; } catch {}
      if (onEnded) onEnded();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    video.play().catch(() => undefined);

    return () => {
      try { video.pause(); } catch {}
      video.removeAttribute('src');
      video.load();
      resetTracks(video);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      destroyHls();
    };
  }, [source, onTimeUpdate, onEnded]);

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: '100%', background: 'black' }}
        preload="metadata"
      />
    </div>
  );
}
