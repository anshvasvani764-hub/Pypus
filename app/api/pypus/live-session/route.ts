import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { PYPUS_SYSTEM_PROMPT } from "@/lib/pypus/prompt";
import { PYPUS_LIVE_MODEL } from "@/lib/pypus/live";
import { getISTDateString } from "@/lib/utils/date";

const VOICE_BRAIN_TOOL = {
  name: "pypus_brain",
  description:
    "MANDATORY gateway for every user turn. Send the user's request exactly as heard. The server runs the same Pypus Chat brain with the same system prompt, business tools, workspace data, UI context, resolved context, language rules, confirmation rules and response style. Never answer the user directly before calling this tool.",
  parametersJsonSchema: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The user's exact request, preserving their language and wording as closely as possible.",
      },
    },
    required: ["query"],
  },
};

function sanitizeRuntimeContext(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.route !== "string" || typeof r.screen !== "string") return null;
  const entity = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const e = value as Record<string, unknown>;
    if (typeof e.type !== "string" || typeof e.id !== "string" || !e.id) return null;
    return { type: e.type.slice(0, 80), id: e.id.slice(0, 200), name: typeof e.name === "string" ? e.name.slice(0, 200) : null };
  };
  const visibleEntities = Array.isArray(r.visibleEntities) ? r.visibleEntities.slice(0, 50).map(entity).filter(Boolean) : [];
  const visibleData: Record<string, string | number | boolean | null> = {};
  if (r.visibleData && typeof r.visibleData === "object") {
    for (const [key, value] of Object.entries(r.visibleData as Record<string, unknown>).slice(0, 50)) {
      if (["string", "number", "boolean"].includes(typeof value) || value === null) visibleData[key.slice(0, 100)] = value as string | number | boolean | null;
    }
  }
  return {
    route: r.route.slice(0, 500),
    screen: r.screen.slice(0, 120),
    module: typeof r.module === "string" ? r.module.slice(0, 120) : null,
    selectedEntity: entity(r.selectedEntity),
    visibleEntities,
    visibleData,
    availableActions: Array.isArray(r.availableActions) ? r.availableActions.slice(0, 30).map((a) => {
      if (!a || typeof a !== "object") return null;
      const x = a as Record<string, unknown>;
      if (typeof x.action !== "string") return null;
      return { action: x.action.slice(0, 100), label: typeof x.label === "string" ? x.label.slice(0, 200) : undefined, entity: entity(x.entity) };
    }).filter(Boolean) : [],
    recentAction: (() => {
      if (!r.recentAction || typeof r.recentAction !== "object") return null;
      const a = r.recentAction as Record<string, unknown>;
      if (typeof a.action !== "string") return null;
      return { action: a.action.slice(0, 100), label: typeof a.label === "string" ? a.label.slice(0, 200) : undefined, entity: entity(a.entity) };
    })(),
    capturedAt: typeof r.capturedAt === "string" ? r.capturedAt : new Date().toISOString(),
  };
}

function buildVoiceSystemPrompt(uiContext: unknown, resolvedContext: unknown) {
  const safeUIContext = sanitizeRuntimeContext(uiContext);
  const safeResolvedContext = resolvedContext && typeof resolvedContext === "object" ? resolvedContext : null;
  return `${PYPUS_SYSTEM_PROMPT}\n\nVOICE RUNTIME CONTEXT\nToday is ${getISTDateString()} (Asia/Kolkata).\n\nCURRENT UI CONTEXT (live app state; use it for references and navigation; the shared Pypus brain also receives this context):\n${JSON.stringify(safeUIContext ?? "Not available")}\n\nCURRENT RESOLVED ENTITY CONTEXT:\n${JSON.stringify(safeResolvedContext ?? "None")}\n\nVOICE TRANSPORT RULES\n- You are only the voice transport for Pypus, not a separate assistant brain.\n- For EVERY user turn, call pypus_brain first. Do not answer, clarify, explain, or guess before calling it.\n- Pass the user's request exactly as heard in the query field.\n- After pypus_brain returns, speak the returned reply exactly as provided. Do not paraphrase it, add filler, change its language, or invent anything.\n- The shared Pypus brain is responsible for tool selection, business data, navigation, language, confirmations, and response style.\n`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Voice mode isn't configured yet — add LLM_API_KEY in .env.local" }, { status: 503 });

  let uiContext: unknown = null;
  let resolvedContext: unknown = null;
  try {
    const body = await request.json();
    uiContext = body?.uiContext ?? null;
    resolvedContext = body?.resolvedContext ?? null;
  } catch {
    // Context is optional; the session can still start without it.
  }

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: PYPUS_LIVE_MODEL,
          config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {} },
        },
      },
    });
    return NextResponse.json({
      token: token.name,
      model: PYPUS_LIVE_MODEL,
      systemPrompt: buildVoiceSystemPrompt(uiContext, resolvedContext),
      tools: [VOICE_BRAIN_TOOL],
    });
  } catch (err) {
    console.error("pypus/live-session: failed to mint ephemeral token", err);
    return NextResponse.json({ error: "Couldn't start voice mode. Please try again shortly." }, { status: 502 });
  }
}
