'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';

const COMMON_SLUGS = ['terms', 'privacy', 'refund', 'cancellation', 'community'];

export function LegalNewClient() {
  const router = useRouter();
  const [slug, setSlug] = useState('terms');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      clientFetch('/api/admin/cms/legal-pages', {
        method: 'POST',
        body: JSON.stringify({
          slug,
          title,
          body,
          effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined,
          isPublished,
        }),
      }),
    onSuccess: () => {
      toast.success('Version created');
      router.push('/cms/legal' as never);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (
          isPublished &&
          !confirm(
            `Publish "${title}" as the live ${slug} page? Any existing live version of ${slug} will be unpublished.`,
          )
        )
          return;
        create.mutate();
      }}
      className="card max-w-4xl space-y-5 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr,2fr]">
        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Slug
          </label>
          <input
            list="legal-slugs"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="input w-full font-mono"
          />
          <datalist id="legal-slugs">
            {COMMON_SLUGS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
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
            placeholder="Terms of Service"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
          Body (markdown)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          required
          className="input w-full resize-y font-mono text-small"
          placeholder="# Terms of Service&#10;&#10;Effective from..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Effective from (optional)
          </label>
          <input
            type="datetime-local"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            className="input w-full"
          />
        </div>
        <label className="flex items-end gap-2 text-small text-ink">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Publish immediately (replaces live version for this slug)
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-card border border-border bg-surface px-4 py-2 text-small font-medium text-ink hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {create.isPending ? 'Saving…' : 'Save version'}
        </button>
      </div>
    </form>
  );
}
