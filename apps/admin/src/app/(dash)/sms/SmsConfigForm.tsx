'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { TestSmsModal } from './TestSmsModal';

export type SmsProviderName = 'mock' | 'smartping' | 'twofactor' | 'msg91';

export type SmsConfig = {
  provider: SmsProviderName;
  smartping: {
    username: string;
    password: string;
    sender: string;
    dltContentId: string;
    dltPrincipalEntityId: string;
    template: string;
  };
  twofactor: {
    apiKey: string;
    templateName: string;
  };
  msg91: {
    authKey: string;
    templateId: string;
    senderId: string;
  };
};

const PROVIDER_OPTIONS: { value: SmsProviderName; label: string; helper: string }[] = [
  { value: 'mock', label: 'Mock', helper: 'Logs OTP to console only. Dev/test.' },
  { value: 'smartping', label: 'SmartPing', helper: 'TRAI-DLT, branded sender. Current prod.' },
  { value: 'twofactor', label: '2Factor', helper: 'India OTP service, easier setup.' },
  { value: 'msg91', label: 'MSG91', helper: 'Post-DLT. Class not wired yet.' },
];

export function SmsConfigForm({ initial }: { initial: SmsConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<SmsConfig>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [testOpen, setTestOpen] = useState(false);

  const dirty = JSON.stringify(config) !== JSON.stringify(initial);

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch('/api/admin/sms-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Save failed.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }

  function resetUnsaved() {
    setConfig(initial);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Provider switcher */}
      <section className="card overflow-hidden">
        <header className="border-b border-border bg-surface-muted px-6 py-3">
          <h2 className="text-h3 font-semibold text-ink">Active provider</h2>
          <p className="text-caption text-ink-subtle">
            Which gateway handles every OTP request. Switch here, fill the fields below, hit Save.
          </p>
        </header>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROVIDER_OPTIONS.map((opt) => {
            const selected = config.provider === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConfig({ ...config, provider: opt.value })}
                className={`rounded-card border p-3 text-left transition-colors ${
                  selected
                    ? 'border-brand bg-brand/10 ring-1 ring-brand'
                    : 'border-border bg-surface hover:bg-surface-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold text-ink">{opt.label}</span>
                  {selected && <span className="pill bg-brand/20 text-brand">Active</span>}
                </div>
                <p className="mt-1 text-caption text-ink-subtle">{opt.helper}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Per-provider fields */}
      {config.provider === 'smartping' && (
        <SmartPingFields
          value={config.smartping}
          onChange={(smartping) => setConfig({ ...config, smartping })}
        />
      )}
      {config.provider === 'twofactor' && (
        <TwoFactorFields
          value={config.twofactor}
          onChange={(twofactor) => setConfig({ ...config, twofactor })}
        />
      )}
      {config.provider === 'msg91' && (
        <Msg91Fields value={config.msg91} onChange={(msg91) => setConfig({ ...config, msg91 })} />
      )}
      {config.provider === 'mock' && (
        <section className="card p-6">
          <p className="text-body text-ink-subtle">
            Mock provider has no settings. OTPs will only be printed to the API console (and
            <code className="mx-1 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-caption">
              .last-otp.txt
            </code>
            ). Do NOT use in production.
          </p>
        </section>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3 text-caption">
          {dirty && <span className="text-warning">● Unsaved changes</span>}
          {saved && <span className="text-success">✓ Saved — live within 30 sec</span>}
          {error && <span className="text-danger">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setTestOpen(true)} className="btn-ghost text-small">
            Send test SMS
          </button>
          {dirty && (
            <button type="button" onClick={resetUnsaved} className="btn-ghost text-small">
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="btn-primary text-small"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {testOpen && (
        <TestSmsModal draftConfig={dirty ? config : undefined} onClose={() => setTestOpen(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Per-provider field sections
// ─────────────────────────────────────────────────────────────

function SmartPingFields({
  value,
  onChange,
}: {
  value: SmsConfig['smartping'];
  onChange: (v: SmsConfig['smartping']) => void;
}) {
  const previewText = value.template.replace('{OTP}', '123456');
  const hasOtpVar = value.template.includes('{OTP}');
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-border bg-surface-muted px-6 py-3">
        <h2 className="text-h3 font-semibold text-ink">SmartPing.ai</h2>
        <p className="text-caption text-ink-subtle">
          TRAI-DLT compliant. Sender ID + template are bound to the DLT-registered content ID — text
          must match exactly or telco scrubber rejects.
        </p>
      </header>
      <div className="grid gap-5 p-6 md:grid-cols-2">
        <Field
          label="Username"
          hint="SmartPing account login (e.g. SANKALPNEW.trans)"
          value={value.username}
          onChange={(v) => onChange({ ...value, username: v })}
        />
        <Field
          label="Password"
          type="password"
          hint="Stored masked. Edit only when rotating."
          value={value.password}
          onChange={(v) => onChange({ ...value, password: v })}
        />
        <Field
          label="Sender ID"
          hint="6-char DLT-approved header (e.g. SINDEX)"
          value={value.sender}
          onChange={(v) => onChange({ ...value, sender: v })}
        />
        <Field
          label="DLT Content ID"
          hint="From SmartPing dashboard → Templates"
          value={value.dltContentId}
          onChange={(v) => onChange({ ...value, dltContentId: v })}
        />
        <Field
          label="DLT Principal Entity ID"
          hint="Company-level DLT registration ID"
          value={value.dltPrincipalEntityId}
          onChange={(v) => onChange({ ...value, dltPrincipalEntityId: v })}
          className="md:col-span-2"
        />
        <div className="md:col-span-2">
          <Label
            label="DLT-registered template"
            hint="Must include literal {OTP}. Text MUST match what is registered on the DLT portal character-for-character."
          />
          <textarea
            value={value.template}
            onChange={(e) => onChange({ ...value, template: e.target.value })}
            rows={4}
            className="input font-mono text-small"
            spellCheck={false}
          />
          {!hasOtpVar && value.template.length > 0 && (
            <p className="mt-1 text-caption text-warning">
              Template must contain {'{OTP}'} placeholder.
            </p>
          )}
          {hasOtpVar && (
            <div className="mt-2 rounded-card border border-border bg-surface-muted p-3">
              <p className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">
                Preview (with OTP = 123456)
              </p>
              <p className="mt-1 whitespace-pre-wrap text-small text-ink">{previewText}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TwoFactorFields({
  value,
  onChange,
}: {
  value: SmsConfig['twofactor'];
  onChange: (v: SmsConfig['twofactor']) => void;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-border bg-surface-muted px-6 py-3">
        <h2 className="text-h3 font-semibold text-ink">2Factor.in</h2>
        <p className="text-caption text-ink-subtle">
          OTP-only service. Sender ID + template body are bound to the template name at 2Factor's
          dashboard — no per-request override.
        </p>
      </header>
      <div className="grid gap-5 p-6 md:grid-cols-2">
        <Field
          label="API key"
          type="password"
          hint="From 2Factor dashboard → API key"
          value={value.apiKey}
          onChange={(v) => onChange({ ...value, apiKey: v })}
        />
        <Field
          label="Template name"
          hint="Optional. Blank = default template + generic sender."
          value={value.templateName}
          onChange={(v) => onChange({ ...value, templateName: v })}
        />
      </div>
    </section>
  );
}

function Msg91Fields({
  value,
  onChange,
}: {
  value: SmsConfig['msg91'];
  onChange: (v: SmsConfig['msg91']) => void;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-border bg-surface-muted px-6 py-3">
        <h2 className="text-h3 font-semibold text-ink">MSG91</h2>
        <p className="text-caption text-ink-subtle">
          Post-DLT plan. Fields persist but provider class is not wired yet — saving with this as
          active will fail at send time.
        </p>
      </header>
      <div className="grid gap-5 p-6 md:grid-cols-2">
        <Field
          label="Auth key"
          type="password"
          value={value.authKey}
          onChange={(v) => onChange({ ...value, authKey: v })}
        />
        <Field
          label="Template ID"
          value={value.templateId}
          onChange={(v) => onChange({ ...value, templateId: v })}
        />
        <Field
          label="Sender ID"
          value={value.senderId}
          onChange={(v) => onChange({ ...value, senderId: v })}
        />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Tiny field primitives — keep the per-provider sections terse
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password';
  className?: string;
}) {
  return (
    <div className={className}>
      <Label label={label} hint={hint} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        autoComplete="off"
      />
    </div>
  );
}

function Label({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-small font-semibold text-ink">{label}</label>
      {hint && <p className="text-caption text-ink-subtle">{hint}</p>}
    </div>
  );
}
