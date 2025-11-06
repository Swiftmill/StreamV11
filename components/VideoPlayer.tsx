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
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    function resetTracks() {
      const tracks = videoElement.querySelectorAll('track');
      tracks.forEach(track => track.remove());
      const textTracks = videoElement.textTracks;
      for (let i = textTracks.length - 1; i >= 0; i -= 1) {
        textTracks[i].mode = 'disabled';
      }
    }

    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.load();
    resetTracks();

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoElement.poster = source.poster ?? '';

    if (Hls.isSupported() && source.src.endsWith('.m3u8')) {
      const hls = new Hls({ enableWorker: false, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(source.src);
      hls.attachMedia(videoElement);
    } else {
      videoElement.src = source.src;
    }

    source.subtitles.forEach(subtitle => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = subtitle.lang.toUpperCase();
      track.srclang = subtitle.lang;
      track.src = subtitle.url;
      videoElement.appendChild(track);
    });

    videoElement.currentTime = source.startTime ?? 0;
    videoElement.play().catch(() => undefined);

    function handleTimeUpdate() {
      if (!videoElement.duration || !onTimeUpdate) return;
      onTimeUpdate(videoElement.currentTime, videoElement.duration);
    }

    function handleEnded() {
      videoElement.currentTime = 0;
      if (onEnded) onEnded();
    }

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();
      resetTracks();
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
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
