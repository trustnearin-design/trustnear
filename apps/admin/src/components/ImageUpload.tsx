'use client';

import { useRef, useState, useTransition } from 'react';

/**
 * Image upload field. Dual-mode: pick a file from system (uploads to API
 * /admin/uploads → returns URL → stored on form) or paste an existing URL
 * for content that already lives on a CDN.
 *
 * Backend chooses local FS or S3 transparently based on env vars.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  label,
  hint,
  aspect = 'square',
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label: string;
  hint?: string;
  aspect?: 'square' | 'wide';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`Too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      return;
    }
    setError(null);

    startUpload(async () => {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Upload failed.');
        return;
      }
      onChange(data.data.url);
    });
  }

  const previewBox = aspect === 'wide' ? 'h-32 w-full' : 'h-32 w-32';

  return (
    <div>
      <label className="mb-1.5 block text-small font-semibold text-ink-muted">{label}</label>

      <div className="flex gap-3">
        {/* Preview / dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={
            `${previewBox} relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-card border-2 border-dashed transition ` +
            (dragOver
              ? 'border-accent bg-accent/5'
              : value
                ? 'border-border bg-surface-muted'
                : 'border-border bg-surface-muted hover:border-brand-300 hover:bg-brand-50')
          }
        >
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand/60 text-caption font-semibold text-ink-inverse">
                  Uploading…
                </div>
              )}
            </>
          ) : (
            <div className="px-3 text-center">
              {uploading ? (
                <p className="text-caption font-semibold text-brand">Uploading…</p>
              ) : (
                <>
                  <p className="text-caption font-semibold text-ink-muted">
                    {dragOver ? 'Drop image here' : 'Click or drag image'}
                  </p>
                  <p className="mt-0.5 text-caption text-ink-subtle">PNG · JPG · WebP · 5MB max</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* URL paste + clear */}
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input"
            placeholder="…or paste an image URL (https://…)"
          />
          {hint && <p className="text-caption text-ink-subtle">{hint}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-ghost text-small"
            >
              {value ? 'Replace…' : 'Upload from device…'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="btn-ghost text-small text-danger hover:bg-danger/5"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-2 text-small text-danger">{error}</p>}
    </div>
  );
}
