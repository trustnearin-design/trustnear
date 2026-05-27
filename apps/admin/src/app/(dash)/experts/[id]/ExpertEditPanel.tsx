'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ExpertEditForm } from './ExpertEditForm';

/**
 * Client wrapper that toggles between read-only profile summary and the
 * full ExpertEditForm. Lives at the top of the expert detail page so the
 * admin can update photo / bio / portfolio without leaving the page.
 */
export function ExpertEditPanel({
  expertId,
  initial,
}: {
  expertId: string;
  initial: {
    fullName: string;
    profilePhoto: string;
    professionalTitle: string;
    bio: string;
    yearsExperience: number;
    portfolioUrls: string[];
    certifications: string[];
    introVideoUrl: string;
  };
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-ink">Edit profile</h2>
          <span className="pill bg-warning/10 text-warning">Editing</span>
        </div>
        <ExpertEditForm expertId={expertId} initial={initial} onClose={() => setEditing(false)} />
      </section>
    );
  }

  return (
    <section className="card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-ink">Customer-facing profile</h2>
        <button type="button" onClick={() => setEditing(true)} className="btn-primary text-small">
          Edit profile
        </button>
      </div>

      <div className="flex gap-5">
        <div className="shrink-0">
          {initial.profilePhoto ? (
            <Image
              src={initial.profilePhoto}
              alt={initial.fullName}
              width={120}
              height={120}
              unoptimized
              className="h-30 w-30 rounded-card object-cover"
              style={{ width: 120, height: 120 }}
            />
          ) : (
            <div
              className="flex h-30 w-30 items-center justify-center rounded-card border-2 border-dashed border-border bg-surface-muted text-caption text-ink-subtle"
              style={{ width: 120, height: 120 }}
            >
              No photo
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
              Name
            </p>
            <p className="text-body font-semibold text-ink">{initial.fullName || '—'}</p>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
              Title
            </p>
            <p className="text-body text-ink">{initial.professionalTitle || '—'}</p>
          </div>
          {initial.bio && (
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
                Bio
              </p>
              <p className="text-body text-ink-muted">{initial.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio strip */}
      {initial.portfolioUrls.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-ink-subtle">
            Portfolio ({initial.portfolioUrls.length})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {initial.portfolioUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Portfolio ${i + 1}`}
                className="h-20 w-28 shrink-0 rounded-card object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {initial.certifications.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-ink-subtle">
            Certifications
          </p>
          <div className="flex flex-wrap gap-2">
            {initial.certifications.map((c, i) => (
              <span key={i} className="rounded-pill bg-brand-50 px-3 py-1 text-caption text-brand">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
