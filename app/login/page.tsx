'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { AuthApiError } from '@supabase/supabase-js';
import zxcvbn from 'zxcvbn';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/dashboard';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [username, setUsername] = useState('');

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);

  // Password strength (visual only — no blocking)
  const score = useMemo(() => zxcvbn(password || '').score, [password]); // 0..4
  const label = useMemo(
    () => ['Very weak', 'Weak', 'Okay', 'Good', 'Strong'][score],
    [score]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace(next);
    })();
  }, [router, next]);

  const handleErrorMessage = (err: unknown) => {
    const api = err as AuthApiError & { status?: number };
    const raw = api?.message ?? (err as any)?.message ?? String(err);
    if (/already\s*registered/i.test(raw)) return 'That email already has an account. Please sign in.';
    if (/invalid login credentials/i.test(raw)) return 'Invalid login. Check your email and password.';
    if (/password/i.test(raw)) return raw;
    if (/rate limit/i.test(raw)) return 'Too many attempts. Please try again in a minute.';
    return raw || 'Something went wrong.';
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setCanResend(false);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Keep only basic checks: username format + passwords match.
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          throw new Error('Pick a username 3–20 chars (a–z, 0–9, underscore).');
        }
        if (password !== password2) {
          throw new Error('Passwords do not match.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password, // no min length enforcement here
          options: {
            data: { username },
            emailRedirectTo: 'http://localhost:3002/login',
          },
        });
        if (error) throw error;

        const session = data?.session;
        const user = data?.user;

        if (session && user) {
          // Email confirmation OFF
          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert({ id: user.id, username }, { onConflict: 'id' });
          if (upsertErr) {
            if ((upsertErr as any).code === '23505') {
              throw new Error('That username is already taken.');
            }
            throw upsertErr;
          }
          router.push(next);
        } else {
          // Email confirmation ON
          setMsg('Account created! Please check your email to confirm before logging in.');
          setCanResend(true);
        }
      } else {
        // Sign in: no min length, no client-side strength rules
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
      }
    } catch (err) {
      setMsg(handleErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setMsg(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setMsg('Confirmation email re-sent. Please check your inbox (and spam).');
    } catch (err) {
      setMsg(handleErrorMessage(err));
    }
  };

  const resetPassword = async () => {
    setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3002/reset',
      });
      if (error) throw error;
      setMsg('Password reset email sent. Check your inbox.');
    } catch (err) {
      setMsg(handleErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl shadow p-6 space-y-4 bg-white">
        <h1 className="text-2xl font-semibold text-center">
          Silo — {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            {/* Strength meter is visual only; does not block */}
            {mode === 'signup' && (
              <div className="mt-2">
                <div className="h-2 w-full rounded bg-neutral-200 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      score >= 3 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${((score + 1) / 5) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-neutral-600 flex justify-between">
                  <span>Strength: {label}</span>
                  <span>(Visual only)</span>
                </div>
              </div>
            )}
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm mb-1">Confirm password</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Username</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="text"
                  placeholder="e.g. elyad_osh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  3–20 chars, lowercase letters, numbers, underscore. Must be unique.
                </p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="text-sm text-center space-y-2">
          {mode === 'signin' ? (
            <>
              <div>
                No account?{' '}
                <button className="underline" onClick={() => setMode('signup')}>
                  Create one
                </button>
              </div>
              <div>
                Forgot password?{' '}
                <button className="underline" onClick={resetPassword}>
                  Send reset email
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                Already have an account?{' '}
                <button className="underline" onClick={() => setMode('signin')}>
                  Sign in
                </button>
              </div>
              {canResend && (
                <div>
                  Didn’t get the confirmation email?{' '}
                  <button className="underline" onClick={resendConfirmation}>
                    Resend
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {msg && <div className="text-center text-sm">{msg}</div>}
      </div>
    </div>
  );
}
