'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function AuthSessionButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState('');

  async function handleSignOut() {
    setIsSigningOut(true);
    setError('');

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Unable to sign out.');

      try {
        localStorage.removeItem('al_shaheen_admin_session');
        localStorage.removeItem('al_shaheen_admin_token');
        sessionStorage.removeItem('al_shaheen_admin_session');
        sessionStorage.removeItem('al_shaheen_admin_token');
      } catch (storageError) {
        console.error('Unable to clear legacy admin session storage:', storageError);
      }

      window.location.replace('/login');
    } catch (signOutError) {
      console.error('Sign out failed:', signOutError);
      setError('Sign out failed. Please try again.');
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isSigningOut ? 'Signing out…' : 'Log Out'}
      </button>
      {error && (
        <span role="alert" className="text-xs font-medium text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
