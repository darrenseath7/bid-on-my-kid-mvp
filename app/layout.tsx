import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bid On My Kid MVP',
  description: 'Live school art auction fundraising platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
