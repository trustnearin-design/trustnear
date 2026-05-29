'use client';

import { useState } from 'react';
import type { SmsConfig } from './SmsConfigForm';

export function TestSmsModal({
  draftConfig,
  onClose,
}: {
  draftConfig?: SmsConfig;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState('+91');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { kind: 'idle' }
    | { kind: 'sent'; provider: string; messageId: string | null }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  async function send() {
    setSending(true);
    setResult({ kind: 'idle' });
    try {
      const res = await fetch('/api/admin/sms-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          ...(draftConfig ? { draftConfig } : {}),
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        setResult({ kind: 'error', message: data?.error?.message ?? 'Send failed.' });
        return;
      }
      setResult({
        kind: 'sent',
        provider: data.data.provider,
        messageId: data.data.providerMessageId ?? null,
      });
    } catch (err) {
      setResult({ kind: 'error', message: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="border-b border-border bg-surface-muted px-6 py-4">
          <h2 className="text-h3 font-semibold text-ink">Send test SMS</h2>
          <p className="text-caption text-ink-subtle">
            {draftConfig
              ? 'Uses your unsaved draft config — verify before saving.'
              : 'Uses the saved config currently active in the API.'}
          </p>
        </header>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-small font-semibold text-ink">
              Recipient phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="input"
              autoFocus
            />
            <p className="mt-1 text-caption text-ink-subtle">
              Bypasses the 3/hr rate limit. OTP body will be the literal text
              <code className="mx-1 rounded bg-surface-muted px-1.5 py-0.5 font-mono">123456</code>
              (test code).
            </p>
          </div>

          {result.kind === 'sent' && (
            <div className="rounded-card border border-success/30 bg-success/10 p-3">
              <p className="text-small font-semibold text-success">✓ Submitted</p>
              <p className="mt-1 text-caption text-ink-subtle">
                Provider: <span className="font-mono">{result.provider}</span>
                {result.messageId && (
                  <>
                    {' '}
                    · Msg ID: <span className="font-mono">{result.messageId}</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-caption text-ink-subtle">
                Check phone in 30–60 sec. Gateway-accept ≠ delivered — confirm on actual device.
              </p>
            </div>
          )}

          {result.kind === 'error' && (
            <div className="rounded-card border border-danger/30 bg-danger/10 p-3">
              <p className="text-small font-semibold text-danger">Send failed</p>
              <p className="mt-1 text-caption text-ink">{result.message}</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted px-6 py-3">
          <button type="button" onClick={onClose} className="btn-ghost text-small">
            Close
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || phone.length < 10}
            className="btn-primary text-small"
          >
            {sending ? 'Sending…' : 'Send test'}
          </button>
        </footer>
      </div>
    </div>
  );
}
