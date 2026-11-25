'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';

type FieldErrors = {
  username?: string;
  password?: string;
};

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[!-~]{12}$/;

function getUsernameError(value: string): string | undefined {
  if (!value.trim()) return 'Enter your admin username.';
  if (value.length > 128) return 'Username must be 128 characters or fewer.';
}

function getPasswordError(value: string): string | undefined {
  if (!value) return 'Enter your password.';
  if (!PASSWORD_PATTERN.test(value)) {
    return 'Use exactly 12 characters with uppercase, lowercase, a number, and a symbol. No spaces.';
  }
}

function getAppRedirect(): string {
  const requested = new URLSearchParams(window.location.search).get('next');
  if (!requested) return '/workshop';

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
    return '/workshop';
  }
  return '/workshop';
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsError, setCredentialsError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameInvalid = Boolean(fieldErrors.username || credentialsInvalid);
  const passwordInvalid = Boolean(fieldErrors.password || credentialsInvalid);

  function clearErrors() {
    setFieldErrors({});
    setCredentialsInvalid(false);
    setCredentialsError('');
  }

  function validateForm(): FieldErrors {
    return {
      username: getUsernameError(username),
      password: getPasswordError(password),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearErrors();

    const nextFieldErrors = validateForm();
    setFieldErrors(nextFieldErrors);
    const validationError = nextFieldErrors.username || nextFieldErrors.password;
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          const message = 'Username or password is incorrect.';
          setCredentialsInvalid(true);
          setCredentialsError(message);
          toast.error(message);
          return;
        }
        if (response.status === 400) {
          const message = result.error || getPasswordError(password) || 'Invalid password.';
          setFieldErrors((current) => ({
            ...current,
            password: message,
          }));
          toast.error(message);
          return;
        }
        toast.error(result.error || 'Unable to sign in. Please try again.');
        return;
      }

      toast.success('Signed in successfully.');
      window.location.replace(getAppRedirect());
    } catch {
      toast.error('Unable to connect. Check your connection and try again.');
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className={`mb-1.5 block text-[12px] font-extrabold tracking-wide ${
                usernameInvalid ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              ADMIN USERNAME
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              aria-required="true"
              aria-invalid={usernameInvalid}
              aria-describedby={
                fieldErrors.username
                  ? 'username-error'
                  : credentialsInvalid
                    ? 'credentials-error'
                    : undefined
              }
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearErrors();
              }}
              onBlur={() =>
                setFieldErrors((current) => ({
                  ...current,
                  username: getUsernameError(username),
                }))
              }
              placeholder="Enter admin username"
              className={`h-12 w-full rounded-[10px] border px-4 text-[14px] outline-none transition placeholder:text-slate-400 ${
                usernameInvalid
                  ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-600/20'
                  : 'border-slate-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20'
              }`}
            />
            {fieldErrors.username && (
              <p id="username-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className={`mb-1.5 block text-[12px] font-extrabold tracking-wide ${
                passwordInvalid ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              PASSWORD
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                aria-required="true"
                aria-invalid={passwordInvalid}
                aria-describedby={
                  fieldErrors.password
                    ? 'password-error'
                    : credentialsInvalid
                      ? 'credentials-error'
                      : undefined
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearErrors();
                }}
                onBlur={() =>
                  setFieldErrors((current) => ({
                    ...current,
                    password: getPasswordError(password),
                  }))
                }
                placeholder="Enter your 12-character password"
                className={`h-12 w-full rounded-[10px] border px-4 pr-12 text-[14px] outline-none transition placeholder:text-slate-400 ${
                  passwordInvalid
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-600/20'
                    : 'border-slate-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[10px] text-slate-500 transition hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password ? (
              <p id="password-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            ) : credentialsError ? (
              <p id="credentials-error" role="alert" className="mt-1.5 text-xs text-red-600">
                {credentialsError}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#101a32] text-[15px] font-extrabold text-white shadow-[0_6px_15px_rgba(15,23,42,0.28)] transition hover:bg-[#172544] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-wait disabled:opacity-70"
          >
            <LockKeyhole className="h-4 w-4 text-amber-400" aria-hidden="true" />
            {isSubmitting ? 'Signing In…' : 'Log In Securely'}
          </button>
        </form>
      </section>
    </main>
  );
}
