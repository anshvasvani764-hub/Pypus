import type { createClient } from "@/lib/supabase/server";
import { getISTDateString } from "@/lib/utils/date";
import { isPureReference, setResolvedContext, type ResolvedContext } from "./resolved-context";
import { fuzzyFind } from "./fuzzy-match";

export type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * "low"  → tool executes immediately when called, no confirmation needed
 *          (reversible, non-monetary — e.g. adding a member, marking attendance).
 * "high" → tool MUST be called once without args.confirmed, return a preview via
 *          needsConfirmation() below, and only actually act once the model calls
 *          it again with confirmed:true after the owner explicitly agrees.
 * Omitted on a tool = treated as "low" (only set explicitly where it matters).
 */
export type RiskLevel = "low" | "high";

export interface PypusTool {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  riskLevel?: RiskLevel;
  run: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolContext {
  supabase: Supabase;
  workspaceId: string;
  /**
   * The entity ("usko"/"iska"/"ye wala") the conversation last resolved,
   * carried in from the client's previous turn. Resolvers read this to
   * answer pure-pronoun references, and overwrite it (via
   * setResolvedContext in ./resolved-context) whenever they land on a
   * single confident match, so it's always current by the time the route
   * handler reads it back after the tool loop finishes. Absent/null means
   * there's nothing to fall back to yet.
   */
  resolvedContext?: ResolvedContext | null;
  /**
   * Set by the suggest_page tool (./navigation.ts) when the agent points the
   * owner to a specific screen. A plain mutable field on the same shared
   * ToolContext, exactly like resolvedContext above — the route handler
   * reads it back once the tool loop finishes and returns it to the client
   * so the chat UI can render a "go there" button next to the reply.
   */
  navigationSuggestion?: { route: string; label: string } | null;
}

/**
 * Shared confirmation gate for "high" risk tools. Call at the top of run()
 * with a preview of what the action WOULD do. Returns a payload to hand
 * straight back to the model when confirmation is still needed, or null
 * when args.confirmed === true and the tool should go ahead and act.
 */
export function needsConfirmation(
  args: Record<string, unknown>,
  preview: Record<string, unknown>
): { requiresConfirmation: true; preview: Record<string, unknown> } | null {
  if (args.confirmed === true) return null;
  return { requiresConfirmation: true, preview };
}

// ── date helpers (all IST-anchored) ───────────────────────────────

export const IST_OFFSET = "+05:30";
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function istParts() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Shift a 'YYYY-MM-DD' string by a whole number of days. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** monthOffset 0 = current IST month, -1 = previous. Returns inclusive date bounds. */
export function monthRange(monthOffset = 0) {
  const { year, month } = istParts();
  const start = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const next = new Date(Date.UTC(year, month + monthOffset, 1));
  return {
    label: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}`,
    start: start.toISOString().slice(0, 10),
    endExclusive: next.toISOString().slice(0, 10),
    end: shiftDate(next.toISOString().slice(0, 10), -1),
  };
}

export function weekStart(): string {
  const { year, month, day } = istParts();
  const now = new Date(Date.UTC(year, month - 1, day));
  return shiftDate(now.toISOString().slice(0, 10), -((now.getUTCDay() + 6) % 7));
}

export function today(): string {
  return getISTDateString();
}

export function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** timestamptz bounds for an inclusive-start / exclusive-end IST date window */
export function tsRange(startDate: string, endExclusive: string) {
  return { from: `${startDate}T00:00:00${IST_OFFSET}`, to: `${endExclusive}T00:00:00${IST_OFFSET}` };
}

export const outstandingOf = (f: { amount_snapshot: number | null; paid_amount: number | null }) =>
  (f.amount_snapshot ?? 0) - (f.paid_amount ?? 0);

// ── shared loaders ────────────────────────────────────────────────

export interface MemberRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  plan_id: string | null;
  trainer_id: string | null;
  joined_at: string | null;
}

export async function loadMembers({ supabase, workspaceId }: ToolContext): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id, name, email, phone, plan_id, trainer_id, joined_at")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return data ?? [];
}

export async function loadPlanNames({ supabase, workspaceId }: ToolContext) {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, duration, price")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/** Workspace display name — needed as a WhatsApp template param wherever a
 * message is sent (reminders, receipts), so it's a shared loader rather
 * than each tool re-querying the workspaces table itself. */
export async function loadWorkspaceName({ supabase, workspaceId }: ToolContext): Promise<string> {
  const { data } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  return data?.name ?? "";
}

/**
 * Members are addressed by name in chat, so every member-scoped tool resolves a
 * free-text name first. Ambiguity is returned to the model rather than guessed.
 */
export async function resolveMember(ctx: ToolContext, rawName: unknown) {
  const query = String(rawName ?? "").trim().toLowerCase();

  // Pure pronoun/reference ("usko", "iska number", "ye wala", "") — no real
  // name token left to match on, so fall back to whatever the conversation
  // last resolved to a member instead of guessing.
  if (isPureReference(query)) {
    if (ctx.resolvedContext?.entityType === "member") {
      const { data, error } = await ctx.supabase
        .from("members")
        .select("id, name, email, phone, plan_id, trainer_id, joined_at")
        .eq("workspace_id", ctx.workspaceId)
        .eq("id", ctx.resolvedContext.entityId)
        .maybeSingle();
      if (!error && data) {
        setResolvedContext(ctx, { entityType: "member", entityId: data.id, entityName: data.name });
        return { member: data };
      }
    }
    return { error: "member_name is required" as const };
  }

  const members = await loadMembers(ctx);
  const exact = members.filter((m) => m.name.toLowerCase() === query);
  const partial = members.filter((m) => m.name.toLowerCase().includes(query));
  const byToken = members.filter((m) =>
    query.split(/\s+/).some((t) => t.length > 2 && m.name.toLowerCase().split(/\s+/).includes(t))
  );
  let hits = exact.length ? exact : partial.length ? partial : byToken;

  // Fourth tier: typo tolerance, only when exact/substring/token all missed,
  // and only when it lands on a single confident candidate — a fuzzy tie is
  // never treated as a match.
  if (!hits.length) {
    const fuzzyHits = fuzzyFind(query, members.map((m) => ({ item: m, label: m.name })));
    if (fuzzyHits.length === 1) {
      hits = [fuzzyHits[0].item];
    }
  }

  if (!hits.length) {
    return {
      error: "member_not_found" as const,
      searched: String(rawName ?? ""),
      availableMembers: members.map((m) => m.name),
    };
  }
  if (hits.length > 1) {
    return { error: "ambiguous_member" as const, matches: hits.map((m) => m.name) };
  }
  setResolvedContext(ctx, { entityType: "member", entityId: hits[0].id, entityName: hits[0].name });
  return { member: hits[0] };
}