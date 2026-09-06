import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Simple password gate for /admin/* pages (platform-owner-only tools like
 * the WA cost dashboard) — not per-workspace auth, this is Ansh's own
 * access, not a gym owner's. The rest of the app doesn't have real
 * session auth wired up yet (see the ⚠️ TEMP note in
 * lib/auth/get-current-workspace-context.ts), so a shared-secret cookie is
 * the minimum viable gate rather than building a full admin role system
 * for a single-user tool.
 *
 * Set ADMIN_DASHBOARD_SECRET in the environment to any password you like.
 * If it's unset, access fails closed (nobody gets in, not everybody).
 */
export const ADMIN_SESSION_COOKIE = "pypus_admin_session";

export function hashAdminSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = process.env.ADMIN_DASHBOARD_SECRET;
  if (!secret) return false;

  const store = await cookies();
  return store.get(ADMIN_SESSION_COOKIE)?.value === hashAdminSecret(secret);
}
