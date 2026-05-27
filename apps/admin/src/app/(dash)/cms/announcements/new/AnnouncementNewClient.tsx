'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, Send } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';

export function AnnouncementNewClient() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'customers' | 'professionals'>('all');
  const [deepLink, setDeepLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendNow, setSendNow] = useState(true);

  const create = useMutation({
    mutationFn: async () => {
      const created = await clientFetch<{ id: string }>('/api/admin/cms/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          audience,
          deepLink: deepLink || null,
          scheduledAt: !sendNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      if (sendNow) {
        await clientFetch(`/api/admin/cms/announcements/${created.id}/send`, {
          method: 'POST',
        });
      }
      return created;
    },
    onSuccess: () => {
      toast.success(sendNow ? 'Announcement sent' : 'Announcement saved');
      router.push('/cms/announcements' as never);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not create announcement'),
  });

  const canSubmit = title.trim().length >= 1 && body.trim().length >= 1 && !create.isPending;

  return (
    <div className="grid gap-5 lg:grid-cols-[7fr,5fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            sendNow &&
            !confirm(`Send "${title}" to all ${audience} immediately? This cannot be undone.`)
          )
            return;
          create.mutate();
        }}
        className="card space-y-4 p-5"
      >
        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className="input w-full"
            placeholder="Eg. Diwali offers are live"
          />
        </div>

        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={2000}
            required
            className="input w-full resize-y"
            placeholder="Tap to see this week's offers across all services."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as 'all' | 'customers' | 'professionals')}
              className="input w-full"
            >
              <option value="all">Everyone (customers + experts)</option>
              <option value="customers">Customers only</option>
              <option value="professionals">Experts only</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
              Deep link (optional)
            </label>
            <input
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/booking/abc or /category/cleaning"
              className="input w-full font-mono"
            />
          </div>
        </div>

        <fieldset className="space-y-2 rounded-card border border-border p-3">
          <legend className="px-1 text-caption font-semibold uppercase tracking-wider text-ink-muted">
            When
          </legend>
          <label className="flex items-center gap-2 text-small">
            <input
              type="radio"
              checked={sendNow}
              onChange={() => setSendNow(true)}
              className="accent-brand"
            />
            Send immediately on save
          </label>
          <label className="flex items-center gap-2 text-small">
            <input
              type="radio"
              checked={!sendNow}
              onChange={() => setSendNow(false)}
              className="accent-brand"
            />
            Save as draft / schedule
          </label>
          {!sendNow && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input w-full"
            />
          )}
        </fieldset>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-card border border-border bg-surface px-4 py-2 text-small font-medium text-ink hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sendNow ? 'Send now' : 'Save'}
          </button>
        </div>
      </form>

      {/* Preview */}
      <div className="space-y-3">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-muted">
          Push preview
        </p>
        <div className="rounded-card border border-border bg-brand p-4 text-ink-inverse shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-accent text-brand-900">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-brand-200">TrustNear · now</p>
              <p className="mt-0.5 truncate font-semibold">{title.trim() || 'Title preview'}</p>
              <p className="mt-0.5 text-small text-brand-100">
                {body.trim() || 'Body preview will appear here.'}
              </p>
            </div>
          </div>
        </div>
        <p className="text-caption text-ink-subtle">
          Sent to active users with a push token. Devices that have uninstalled or rotated their
          token are skipped automatically.
        </p>
      </div>
    </div>
  );
}
