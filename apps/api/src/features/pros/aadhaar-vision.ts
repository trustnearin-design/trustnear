import type { AadhaarSlot } from './onboarding-service.js';

/**
 * Phase-1 SOFT Aadhaar image check via AWS Rekognition. Never throws and
 * never blocks the upload — it returns a hint the admin sees:
 *   true  → looked like a valid Aadhaar (front/back) / had a face (selfie)
 *   false → no Aadhaar markers / no face detected → flag for admin
 *   null  → check unavailable (no AWS creds, Rekognition error, etc.)
 *
 * Uses the same AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION creds
 * as the S3 uploader. Rekognition reads the image bytes directly (works for
 * both local-FS and S3 storage modes).
 */

// Markers commonly printed on an Aadhaar card (front or back), EN + HI.
const AADHAAR_MARKERS =
  /(aadhaar|aadhar|uidai|unique identification|government of india|भारत\s*सरकार|आधार|प्राधिकरण|mera aadhaar|vid\b|enrol)/i;
// A 12-digit number, usually grouped "1234 5678 9012".
const AADHAAR_NUMBER = /\b\d{4}\s?\d{4}\s?\d{4}\b/;

function hasAwsCreds(): boolean {
  return !!(process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY']);
}

export async function checkAadhaarSlot(
  bytes: Uint8Array,
  slot: AadhaarSlot,
): Promise<boolean | null> {
  if (!hasAwsCreds()) return null;

  try {
    const { RekognitionClient, DetectTextCommand, DetectFacesCommand } =
      await import('@aws-sdk/client-rekognition');
    const region = process.env['AWS_REGION'] ?? 'ap-south-1';
    const client = new RekognitionClient({ region });

    if (slot === 'selfie') {
      const out = await client.send(new DetectFacesCommand({ Image: { Bytes: bytes } }));
      return (out.FaceDetails?.length ?? 0) >= 1;
    }

    // front / back → OCR and look for Aadhaar markers or a 12-digit number.
    const out = await client.send(new DetectTextCommand({ Image: { Bytes: bytes } }));
    const text = (out.TextDetections ?? [])
      .map((t) => t.DetectedText ?? '')
      .join(' ')
      .trim();
    return AADHAAR_MARKERS.test(text) || AADHAAR_NUMBER.test(text);
  } catch {
    // Soft: any AWS/Rekognition failure → unavailable, do not block upload.
    return null;
  }
}
