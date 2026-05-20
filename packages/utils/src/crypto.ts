import { createHash, randomBytes, randomInt } from 'node:crypto';

/**
 * Generate a 6-digit OTP. Uses crypto.randomInt for uniform distribution.
 */
export function generateOtp(): string {
  return String(randomInt(100_000, 1_000_000));
}

/**
 * SHA-256 hash hex. Use for OTP storage (never store plain), request body hashing.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Random URL-safe token (base64url).
 * Default 32 bytes → 43 chars base64url.
 */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Timing-safe string comparison — use whenever comparing secrets (OTPs, signatures).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
