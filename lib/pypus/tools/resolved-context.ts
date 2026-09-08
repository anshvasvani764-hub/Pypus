/**
 * Cross-turn "who/what are we talking about" — lets the user say "usko",
 * "iska", "ye wala" without re-stating a name every turn.
 *
 * Threaded through the request/response body exactly like `history` already
 * is (see app/api/pypus/chat/route.ts and AssistantChat.tsx): no DB table,
 * no server-side session store, just one small object carried forward by
 * the client and updated by whichever resolver last found a single
 * confident entity.
 */

export type ResolvedEntityType = "member" | "expense" | "team_member";

export interface ResolvedContext {
  entityType: ResolvedEntityType;
  entityId: string;
  entityName: string;
}

/**
 * True when `query` is (almost) entirely a pronoun/reference word rather than
 * an actual name — "usko", "iska number", "ye wala", "" — as opposed to
 * "Shukla wala", which still carries a real name token ("Shukla") and should
 * go through normal name matching instead of falling back to context.
 *
 * Deliberately conservative: only strips known reference words, so a real
 * name is never mistaken for a pronoun.
 */
const REFERENCE_WORDS =
  /\b(ye|yeh|woh|wo|iska|uska|isska|isko|usko|isse|usse|isski|usski|inka|unka|wala|wali|wale|hi|bhi|same|wahi|previous|last|pichla|pichli|pichle|abhi\s*wala)\b/gi;

export function isPureReference(query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const stripped = q
    .replace(REFERENCE_WORDS, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();
  return stripped.length === 0;
}

/**
 * Record the entity a resolver just landed on, so the next turn's pronoun
 * can find it. Called by resolvers on their single-hit success path — never
 * on an error, an ambiguous match, or a not-found.
 *
 * ctx.resolvedContext is a plain mutable field on the same ToolContext
 * object threaded through every tool call in this request, so the update is
 * visible to the route handler once the LLM's tool loop finishes.
 */
export function setResolvedContext<T extends { resolvedContext?: ResolvedContext | null }>(
  ctx: T,
  value: ResolvedContext
): void {
  ctx.resolvedContext = value;
}
