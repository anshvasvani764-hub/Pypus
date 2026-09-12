import { NextResponse } from "next/server";
import { checkWorkspaceAccess } from "@/lib/business-brain/access";
import { callBusinessBrainLLM, type BusinessBrainHistoryTurn } from "@/lib/business-brain/gemini";
import { emptyDraft } from "@/lib/business-brain/types";

const MAX_HISTORY_TURNS = 12;

function sanitizeHistory(raw: unknown): BusinessBrainHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is BusinessBrainHistoryTurn =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS);
}

export async function POST(request: Request) {
  let workspaceId: unknown;
  let message: unknown;
  let history: unknown;
  try {
    ({ workspaceId, message, history } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof workspaceId !== "string" || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "workspaceId and message are required" }, { status: 400 });
  }

  const access = await checkWorkspaceAccess(workspaceId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const result = await callBusinessBrainLLM(message, sanitizeHistory(history));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "LLM_API_KEY not set yet") {
      return NextResponse.json({
        reply: "AI provider not configured yet — add LLM_API_KEY (and optionally LLM_MODEL) in .env.local",
        readyToSave: false,
        draft: emptyDraft(),
        error: "LLM_NOT_CONFIGURED",
      });
    }
    if (err instanceof Error && err.message === "MALFORMED_JSON") {
      console.error("business-brain/chat: model returned malformed JSON");
      return NextResponse.json({
        reply: "Maaf karo, mujhe ek malformed response mila — dobara try karo.",
        readyToSave: false,
        draft: emptyDraft(),
        error: "MALFORMED_JSON",
      });
    }
    console.error("business-brain/chat: LLM call failed", err);
    return NextResponse.json({
      reply: "I ran into a problem reaching the AI provider. Please try again shortly.",
      readyToSave: false,
      draft: emptyDraft(),
      error: "LLM_ERROR",
    });
  }
}
