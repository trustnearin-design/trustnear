import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DomainError, ErrorCode } from '@sevalink/types';

/**
 * Media upload backend. Two modes — local filesystem (default, dev) or S3
 * (production). The frontend never knows which backend is used; it just
 * receives a fully-qualified URL it can drop into <img src>.
 *
 * S3 mode activates when AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY +
 * S3_BUCKET_MEDIA are all set. Until then, files land in
 * `apps/api/uploads/` and are served via the static route mounted in
 * server.ts at /uploads/*.
 *
 * Why local-FS-first: Vikas can demo + manage real images on day one
 * without needing AWS IAM keys. When he provisions S3 (post-launch hardening),
 * he just fills the env vars and re-deploys — no code change. Old local files
 * stay accessible during a backfill migration.
 */

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export type UploadOutput = {
  url: string;
  publicPath: string;
  backend: 'local' | 's3';
  sizeBytes: number;
  mime: string;
};

export async function saveUpload(input: {
  file: File;
  folder: string; // e.g. "categories", "banners"
  publicBaseUrl: string; // request origin, used for local-FS URLs
}): Promise<UploadOutput> {
  if (!ALLOWED_MIME.has(input.file.type)) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `Unsupported file type: ${input.file.type}. Allowed: JPEG, PNG, WebP, GIF, SVG.`,
    );
  }
  if (input.file.size === 0) {
    throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Empty file.');
  }
  if (input.file.size > MAX_BYTES) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `File too large (${(input.file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`,
    );
  }

  // Sanitize folder name — only kebab/alpha allowed
  const safeFolder = input.folder.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'misc';

  // Filename — random hash + original extension. Never trust the upload's
  // filename (could collide, could be malicious).
  const ext = pickExtension(input.file);
  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  const key = `${safeFolder}/${filename}`;

  const bytes = new Uint8Array(await input.file.arrayBuffer());

  // Try S3 first if configured, else local FS.
  if (isS3Configured()) {
    const url = await putS3(key, bytes, input.file.type);
    return {
      url,
      publicPath: `/${key}`,
      backend: 's3',
      sizeBytes: input.file.size,
      mime: input.file.type,
    };
  }

  const dir = join(UPLOAD_DIR, safeFolder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), bytes);

  return {
    url: `${input.publicBaseUrl.replace(/\/$/, '')}/uploads/${key}`,
    publicPath: `/uploads/${key}`,
    backend: 'local',
    sizeBytes: input.file.size,
    mime: input.file.type,
  };
}

function pickExtension(file: File): string {
  const fromName = file.name ? extname(file.name).toLowerCase() : '';
  if (fromName) return fromName;
  const fromMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  return fromMime[file.type] ?? '.bin';
}

function isS3Configured(): boolean {
  return Boolean(
    process.env['AWS_ACCESS_KEY_ID'] &&
    process.env['AWS_SECRET_ACCESS_KEY'] &&
    process.env['S3_BUCKET_MEDIA'],
  );
}

/**
 * S3 PUT — bytes uploaded with a year-long cache header so CloudFront
 * (or S3 directly) can serve them as immutable assets. The key contains a
 * cryptographic-random filename so re-uploads never collide; clients see a
 * fresh URL whenever an image changes.
 */
async function putS3(key: string, bytes: Uint8Array, mime: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const region = process.env['AWS_REGION'] ?? 'ap-south-1';
  const bucket = process.env['S3_BUCKET_MEDIA']!;
  const client = new S3Client({ region });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  // Prefer CloudFront URL if configured (cheaper egress + global edge cache).
  const cdn = process.env['CLOUDFRONT_DOMAIN'];
  if (cdn) {
    return `https://${cdn.replace(/^https?:\/\//, '').replace(/\/$/, '')}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
