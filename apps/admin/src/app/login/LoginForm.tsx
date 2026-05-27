'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'otp';

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Could not send OTP. Try again.');
        return;
      }
      setStep('otp');
    });
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Invalid OTP.');
        return;
      }
      router.replace(data.data?.redirectTo ?? '/dashboard');
    });
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendOtp} className="space-y-5">
        <div>
          <label className="mb-2 block text-small font-semibold text-ink-muted">
            Admin phone number
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            className="input"
            required
          />
        </div>
        {error && <p className="text-small text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending || phone.length < 10}
          className="btn-primary w-full"
        >
          {pending ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="space-y-5">
      <div>
        <label className="mb-2 block text-small font-semibold text-ink-muted">
          Enter the 6-digit code
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="••••••"
          className="input text-center text-h2 tracking-[0.4em]"
          required
        />
        <p className="mt-2 text-caption text-ink-subtle">Sent to {phone}</p>
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
      <button type="submit" disabled={pending || otp.length !== 6} className="btn-primary w-full">
        {pending ? 'Verifying…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep('phone');
          setOtp('');
          setError(null);
        }}
        className="btn-ghost w-full"
      >
        Use a different number
      </button>
    </form>
  );
}
