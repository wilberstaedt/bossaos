import type { Metadata } from 'next';
import { cores } from '@bossaos/ui';

export const metadata: Metadata = {
  title: 'BossaOS',
  description: 'Base executável — E01.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body
        style={{
          margin: 0,
          background: cores.fundo,
          color: cores.texto,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
