import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLMWithTools, type LLMChatMessage } from "@/lib/llm";
import { PYPUS_TOOLS, runPypusTool, type ToolContext } from "@/lib/pypus/tools";
import { PYPUS_SYSTEM_PROMPT } from "@/lib/pypus/prompt";
import { getISTDateString } from "@/lib/utils/date";
import type { ResolvedContext } from "@/lib/pypus/tools/resolved-context";

/** Trusts the shape but not the values — real validation happens wherever this gets used (a resolver looks the id up by workspace, so a forged id just resolves to nothing). */
function sanitizeResolvedContext(raw: unknown): ResolvedContext | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    (r.entityType === "member" || r.entityType === "expense" || r.entityType === "team_member") &&
    typeof r.entityId === "string" &&
    r.entityId &&
    typeof r.entityName === "string"
  ) {
    return { entityType: r.entityType, entityId: r.entityId, entityName: r.entityName };
  }
  return null;
}

/** Only the last few turns are needed to carry a pending confirmation — keeps the request small. */
const MAX_HISTORY_TURNS = 8;

function sanitizeHistory(raw: unknown): LLMChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is LLMChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workspaceId: unknown;
  let message: unknown;
  let history: unknown;
  let resolvedContext: unknown;
  try {
    ({ workspaceId, message, history, resolvedContext } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof workspaceId !== "string" || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "workspaceId and message are required" }, { status: 400 });
  }

  const userMessage = `Today is ${getISTDateString()} (Asia/Kolkata).\n\nQuestion: ${message}`;

  // Mutable and shared across every tool call this turn — resolvers update
  // .resolvedContext in place when they land on a single confident entity,
  // so whatever it holds once the tool loop finishes is what goes back to
  // the client for next turn's "usko"/"iska" to resolve against.
  const ctx: ToolContext = {
    supabase,
    workspaceId,
    resolvedContext: sanitizeResolvedContext(resolvedContext),
  };

  try {
    const reply = await callLLMWithTools(
      PYPUS_SYSTEM_PROMPT,
      userMessage,
      PYPUS_TOOLS.map(({ name, description, parameters }) => ({ name, description, parameters })),
      (name, args) => runPypusTool(name, args, ctx),
      sanitizeHistory(history)
    );
    return NextResponse.json({ reply, resolvedContext: ctx.resolvedContext ?? null });
  } catch (err) {
    // Pass resolvedContext through unchanged on failure — a transient LLM
    // error shouldn't wipe out "who we were just talking about".
    if (err instanceof Error && err.message === "LLM_API_KEY not set yet") {
      return NextResponse.json({
        reply: "AI provider not configured yet — add LLM_API_KEY and LLM_PROVIDER in .env.local",
        resolvedContext: ctx.resolvedContext ?? null,
      });
    }
    console.error("pypus/chat: LLM call failed", err);
    return NextResponse.json({
      reply: "I ran into a problem reaching the AI provider. Please try again shortly.",
      resolvedContext: ctx.resolvedContext ?? null,
    });
  }
}
