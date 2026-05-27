'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ImageUpload } from '@/components/ImageUpload';

/**
 * Edit-in-place form for an expert's customer-facing profile. The admin
 * uploads the photo via the standard ImageUpload component (which talks
 * to `/api/admin/uploads` and returns a URL), then submits the full patch
 * to `/api/admin/experts/:id` which updates user + professional rows in
 * one transaction.
 *
 * Only fields the admin can responsibly edit live here. KYC / trust /
 * service-offerings stay in their dedicated sections.
 */
export function ExpertEditForm({
  expertId,
  initial,
  onClose,
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
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initial.fullName);
  const [profilePhoto, setProfilePhoto] = useState(initial.profilePhoto);
  const [professionalTitle, setProfessionalTitle] = useState(initial.professionalTitle);
  const [bio, setBio] = useState(initial.bio);
  const [yearsExperience, setYearsExperience] = useState(initial.yearsExperience);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(initial.portfolioUrls);
  const [certInput, setCertInput] = useState('');
  const [certifications, setCertifications] = useState<string[]>(initial.certifications);
  const [introVideoUrl, setIntroVideoUrl] = useState(initial.introVideoUrl);

  const addPortfolioSlot = () => {
    if (portfolioUrls.length >= 12) return;
    setPortfolioUrls([...portfolioUrls, '']);
  };
  const setPortfolioAt = (i: number, url: string) => {
    const next = [...portfolioUrls];
    next[i] = url;
    setPortfolioUrls(next);
  };
  const removePortfolioAt = (i: number) => {
    setPortfolioUrls(portfolioUrls.filter((_, j) => j !== i));
  };

  const addCertification = () => {
    const v = certInput.trim();
    if (!v) return;
    if (certifications.length >= 10) return;
    setCertifications([...certifications, v]);
    setCertInput('');
  };
  const removeCertAt = (i: number) => {
    setCertifications(certifications.filter((_, j) => j !== i));
  };

  const submit = () => {
    setError(null);
    startSave(async () => {
      const patch: Record<string, unknown> = {};
      if (fullName !== initial.fullName) patch.fullName = fullName.trim();
      if (profilePhoto !== initial.profilePhoto) patch.profilePhoto = profilePhoto;
      if (professionalTitle !== initial.professionalTitle) {
        patch.professionalTitle = professionalTitle.trim();
      }
      if (bio !== initial.bio) patch.bio = bio.trim();
      if (yearsExperience !== initial.yearsExperience) patch.yearsExperience = yearsExperience;
      const cleanPortfolio = portfolioUrls.filter((u) => u.trim().length > 0);
      if (JSON.stringify(cleanPortfolio) !== JSON.stringify(initial.portfolioUrls)) {
        patch.portfolioUrls = cleanPortfolio;
      }
      if (JSON.stringify(certifications) !== JSON.stringify(initial.certifications)) {
        patch.certifications = certifications;
      }
      if (introVideoUrl !== initial.introVideoUrl) patch.introVideoUrl = introVideoUrl;

      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/admin/experts/${expertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!data?.success) {
        setError(data?.error?.message ?? 'Save failed.');
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <div className="space-y-5">
      <ImageUpload
        label="Profile photo"
        folder="experts"
        value={profilePhoto}
        onChange={setProfilePhoto}
        hint="Square portrait, clear face, neutral background. Max 5MB."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-small font-semibold text-ink-muted">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Rohit Sharma"
            maxLength={80}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-small font-semibold text-ink-muted">
            Professional title
          </label>
          <input
            type="text"
            value={professionalTitle}
            onChange={(e) => setProfessionalTitle(e.target.value)}
            className="input"
            placeholder="TrustNear Cleaning Pro"
            maxLength={80}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-small font-semibold text-ink-muted">
            Years of experience
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(Number(e.target.value) || 0)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-small font-semibold text-ink-muted">
            Intro video URL (optional)
          </label>
          <input
            type="url"
            value={introVideoUrl}
            onChange={(e) => setIntroVideoUrl(e.target.value)}
            className="input"
            placeholder="https://…"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={800}
          className="input"
          placeholder="A short, customer-facing intro. Keep it warm and specific."
        />
        <p className="mt-1 text-caption text-ink-subtle">{bio.length}/800</p>
      </div>

      {/* Portfolio gallery */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-small font-semibold text-ink-muted">
            Portfolio photos ({portfolioUrls.length}/12)
          </label>
          <button
            type="button"
            onClick={addPortfolioSlot}
            disabled={portfolioUrls.length >= 12}
            className="btn-ghost text-small"
          >
            + Add photo
          </button>
        </div>
        {portfolioUrls.length === 0 ? (
          <p className="mt-2 rounded-card border border-dashed border-border bg-surface-muted p-4 text-center text-caption text-ink-subtle">
            No portfolio photos yet. Add up to 12 work samples.
          </p>
        ) : (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {portfolioUrls.map((url, i) => (
              <div key={i} className="relative">
                <ImageUpload
                  label={`Photo ${i + 1}`}
                  folder="experts/portfolio"
                  value={url}
                  onChange={(u) => setPortfolioAt(i, u)}
                  aspect="wide"
                />
                <button
                  type="button"
                  onClick={() => removePortfolioAt(i)}
                  className="absolute right-0 top-0 rounded-full bg-danger px-2 py-0.5 text-caption text-ink-inverse"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">
          Certifications ({certifications.length}/10)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCertification();
              }
            }}
            className="input flex-1"
            placeholder="e.g. ITI Electrical (2020)"
            maxLength={80}
          />
          <button
            type="button"
            onClick={addCertification}
            disabled={!certInput.trim() || certifications.length >= 10}
            className="btn-ghost"
          >
            Add
          </button>
        </div>
        {certifications.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {certifications.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-pill bg-brand-50 px-3 py-1 text-caption text-brand"
              >
                {c}
                <button
                  type="button"
                  onClick={() => removeCertAt(i)}
                  className="text-ink-subtle hover:text-danger"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-small text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
