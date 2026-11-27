import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Al Shaheen Auto Hub - Enterprise Workshop, AI Diagnostics & Lounge TV System',
  description: 'Premier automotive precision engineering, AI mechanical diagnostics, 60" lounge TV broadcast with smart audio ducking, and mobile vehicle tracking in Lahore, Pakistan.',
};

const themeInitScript = `
  (function() {
    try {
      var theme = localStorage.getItem('al_shaheen_theme');
      var resolved = theme === 'light' ? 'light' : 'dark';
      var root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#070b14] dark:text-slate-100"
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
