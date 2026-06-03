import { Share } from 'react-native';

/**
 * Shareable web links. These resolve to the TrustNear site, which is wired
 * for Android App Links + iOS Universal Links (see app.json intentFilters /
 * associatedDomains + the .well-known files on the domain). On a device with
 * the app installed, the OS opens the app straight to the matching route
 * (e.g. /pro/<id> → the expert profile). Without the app, the link opens the
 * website, which offers a store download.
 */
export const WEB_BASE = 'https://trustnear.in';

export function expertUrl(professionalId: string): string {
  return `${WEB_BASE}/pro/${professionalId}`;
}

/**
 * Share the user's referral code. Recipients enter the code when they sign up
 * (and, once the reward rule is enabled server-side, both sides earn credit).
 */
export async function shareReferral(code: string): Promise<void> {
  await Share.share({
    title: 'Join me on TrustNear',
    message: `Get trusted home-service pros on TrustNear — verified maids, electricians, plumbers & more. Use my code ${code} when you sign up. Download: ${WEB_BASE}`,
  }).catch(() => undefined);
}

/**
 * Open the native share sheet for an expert profile. Used by the "send this
 * maid to my family" flow — the recipient taps the link, installs/opens the
 * app, logs in, and lands directly on this expert's profile.
 */
export async function shareExpert(args: {
  professionalId: string;
  fullName: string;
  title?: string | null;
}): Promise<void> {
  const url = expertUrl(args.professionalId);
  const role = args.title ? ` (${args.title})` : '';
  await Share.share({
    title: `${args.fullName} on TrustNear`,
    message: `Check out ${args.fullName}${role} on TrustNear — a verified professional. Book here: ${url}`,
    url, // iOS uses this; Android folds it into the message.
  }).catch(() => undefined);
}
