'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole } from 'lucide-react';

function getAppRedirect(): string {
  const requested = new URLSearchParams(window.location.search).get('next');
  if (!requested) return '/';

  try {
    const destination = new URL(requested, window.location.origin);
    if (
      destination.origin === window.location.origin &&
      destination.pathname !== '/login' &&
      !destination.pathname.startsWith('/api/') &&
      !destination.pathname.startsWith('/_next/')
    ) {
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }
  } catch {
    return '/';
  }
  return '/';
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password, rememberMe }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Unable to sign in. Please try again.');
        return;
      }

      window.location.replace(getAppRedirect());
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1428] px-4 py-8 text-slate-900">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-[508px] rounded-[24px] bg-white px-7 py-9 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:-translate-y-16 sm:px-[35px] sm:py-11"
      >
        <div className="mb-5 flex justify-center">
          <img
            src="/logo.png"
            alt="Al Shaheen Auto Hub"
            className="h-[62px] w-auto object-contain"
          />
        </div>
        <header className="mb-5 text-center">
          <h1 id="login-title" className="text-[23px] font-black tracking-[0.01em] text-[#17233e]">
            AL SHAHEEN AUTO HUB
          </h1>
          <p className="mt-1 text-[14px] text-slate-500">
            Enterprise Workshop, AI Diagnostics &amp; Lounge TV System
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-slate-800"
            >
              ADMIN USERNAME
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              maxLength={128}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter admin username"
              className="h-12 w-full rounded-[10px] border border-slate-300 px-4 text-[14px] outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[12px] font-extrabold tracking-wide text-slate-800"
            >
              PASSWORD
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              className="h-12 w-full rounded-[10px] border border-slate-300 px-4 text-[14px] outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-500">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#101b34]"
            />
            Stay signed in on this computer
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#101a32] text-[15px] font-extrabold text-white shadow-[0_6px_15px_rgba(15,23,42,0.28)] transition hover:bg-[#172544] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-wait disabled:opacity-70"
          >
            <LockKeyhole className="h-4 w-4 text-amber-400" aria-hidden="true" />
            {isSubmitting ? 'Signing In…' : 'Log In Securely'}
          </button>
        </form>

        <footer className="mt-8 text-center text-[12px] text-slate-400">
          Al Shaheen Security Shield
        </footer>
      </section>
    </main>
  );
}
