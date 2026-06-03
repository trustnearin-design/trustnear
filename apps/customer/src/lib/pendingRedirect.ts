/**
 * Pending deep-link redirect.
 *
 * When a shared link (e.g. https://trustnear.in/pro/<id>) opens the app while
 * the user is logged OUT, the auth guard bounces them to the welcome/login
 * flow — which would otherwise lose the destination. We stash the intended
 * path here before bouncing, then consume it right after a successful login
 * so the user lands exactly where the link pointed (the expert's profile).
 *
 * In-memory only (single JS session) — that's all we need: the login flow
 * (welcome → phone → otp) never reloads the bundle.
 */

let pendingPath: string | null = null;

/** Paths worth preserving across a login bounce. Keep this tight so we never
 *  redirect into a screen that assumes prior navigation state. */
export function isDeferrablePath(path: string | null | undefined): path is string {
  if (!path) return false;
  return (
    path.startsWith('/pro/') ||
    path.startsWith('/booking/') ||
    path.startsWith('/category/') ||
    path.startsWith('/book/')
  );
}

export function setPendingRedirect(path: string): void {
  if (isDeferrablePath(path)) pendingPath = path;
}

/** Returns the stashed path (once) and clears it. */
export function consumePendingRedirect(): string | null {
  const p = pendingPath;
  pendingPath = null;
  return p;
}
