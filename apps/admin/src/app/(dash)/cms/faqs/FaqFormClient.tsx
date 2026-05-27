'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { SkeletonBar } from '@/components/Skeletons';

type Faq = {
  id: string;
  slug: string;
  category: string;
  question: string;
  body: string;
  sortOrder: number;
  isPublished: boolean;
};

const COMMON_CATEGORIES = ['general', 'booking', 'payment', 'account', 'experts', 'safety'];

export function FaqFormClient({ mode, id }: { mode: 'create' | 'edit'; id?: string }) {
  const router = useRouter();

  const loaded = useQuery({
    queryKey: ['admin', 'cms', 'faqs', id],
    queryFn: () => clientFetch<Faq>(`/api/admin/cms/faqs/${id}`),
    enabled: mode === 'edit' && !!id,
  });

  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('general');
  const [question, setQuestion] = useState('');
  const [body, setBody] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (mode === 'edit' && loaded.data) {
      const f = loaded.data;
      setSlug(f.slug);
      setCategory(f.category);
      setQuestion(f.question);
      setBody(f.body);
      setSortOrder(String(f.sortOrder));
      setIsPublished(f.isPublished);
    }
  }, [mode, loaded.data]);

  // Auto-fill slug from question on create only
  useEffect(() => {
    if (mode === 'create' && question && !slug) {
      setSlug(
        question
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80),
      );
    }
  }, [question, mode, slug]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        slug,
        category,
        question,
        body,
        sortOrder: Number(sortOrder || 0),
        isPublished,
      };
      if (mode === 'create') {
        return clientFetch<Faq>('/api/admin/cms/faqs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      return clientFetch<Faq>(`/api/admin/cms/faqs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'FAQ created' : 'FAQ updated');
      router.push('/cms/faqs' as never);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  if (mode === 'edit' && loaded.isPending) {
    return <SkeletonBar className="h-96" />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="card max-w-3xl space-y-5 p-6"
    >
      <div>
        <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
          Question
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          required
          className="input w-full"
          placeholder="How do I cancel a booking?"
        />
      </div>

      <div>
        <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
          Answer (markdown supported on client)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
          className="input w-full resize-y font-mono text-small"
          placeholder="You can cancel any booking before the expert starts the trip..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Slug
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            pattern="[a-z0-9-]+"
            required
            disabled={mode === 'edit'}
            className="input w-full font-mono"
            placeholder="cancel-booking"
          />
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Category
          </label>
          <input
            list="faq-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="input w-full"
          />
          <datalist id="faq-categories">
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Sort order
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
            className="input w-full"
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-small text-ink">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Published (visible in customer/pro apps)
      </label>

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
          disabled={save.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {save.isPending ? 'Saving…' : mode === 'create' ? 'Create FAQ' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
