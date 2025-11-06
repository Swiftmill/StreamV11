import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'StreamV11',
  description: 'Streaming platform with cinematic experience',
  applicationName: 'StreamV11',
  themeColor: '#0A0A0A'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
