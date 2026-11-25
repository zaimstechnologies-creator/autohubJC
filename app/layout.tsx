import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Al Shaheen Auto Hub - Enterprise Workshop, AI Diagnostics & Lounge TV System',
  description: 'Premier automotive precision engineering, AI mechanical diagnostics, 60" lounge TV broadcast with smart audio ducking, and mobile vehicle tracking in Lahore, Pakistan.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="bg-[#070b14] text-slate-100 min-h-screen"
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  );
}
