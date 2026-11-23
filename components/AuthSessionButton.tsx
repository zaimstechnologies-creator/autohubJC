'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface AuthSessionButtonProps {
  fullWidth?: boolean;
}

export default function AuthSessionButton({ fullWidth = false }: AuthSessionButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

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

      toast.success('Signed out successfully.');
      window.setTimeout(() => window.location.replace('/'), 500);
    } catch (signOutError) {
      console.error('Sign out failed:', signOutError);
      toast.error('Sign out failed. Please try again.');
      setIsSigningOut(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-2 print:hidden ${
        fullWidth ? 'w-full flex-col items-stretch sm:w-auto sm:flex-row sm:items-center' : ''
      }`}
    >
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 ${fullWidth ? 'w-full sm:w-auto' : ''}`}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isSigningOut ? 'Signing out…' : 'Log Out'}
      </button>
    </div>
  );
}
