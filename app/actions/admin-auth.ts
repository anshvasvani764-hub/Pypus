"use server";

import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, hashAdminSecret } from "@/lib/admin/auth";

export async function verifyAdminPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.ADMIN_DASHBOARD_SECRET;
  if (!secret) {
    return { success: false, error: "ADMIN_DASHBOARD_SECRET env var is not set on the server" };
  }
  if (password !== secret) {
    return { success: false, error: "Wrong password" };
  }

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, hashAdminSecret(secret), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return { success: true };
}
