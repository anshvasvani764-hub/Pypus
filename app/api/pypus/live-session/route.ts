import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { PYPUS_TOOLS } from "@/lib/pypus/tools";
import { PYPUS_SYSTEM_PROMPT } from "@/lib/pypus/prompt";
import { PYPUS_LIVE_MODEL } from "@/lib/pypus/live";
import { getISTDateString } from "@/lib/utils/date";

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
  return `${PYPUS_SYSTEM_PROMPT}\n\nVOICE RUNTIME CONTEXT\nToday is ${getISTDateString()} (Asia/Kolkata).\n\nCURRENT UI CONTEXT (live app state; use it for references and navigation, but verify mutable business facts with tools):\n${JSON.stringify(safeUIContext ?? "Not available")}\n\nCURRENT RESOLVED ENTITY CONTEXT (use for references like ye/iska/usko/wala; tools remain the source of truth):\n${JSON.stringify(safeResolvedContext ?? "None")}\n\nVOICE BEHAVIOUR\nYou are the same Pypus assistant as text chat. Do not switch to generic AI/chatbot behaviour.\nFor business data questions, use the available Pypus tools and answer from their results. Never invent data or say you lack access when a relevant tool can answer.\nFor Pypus navigation/how-to questions, use the UI context and embedded navigation guide. Do not ask which app or website the user means: you are already inside Pypus.\nKeep responses short, natural, and conversational while preserving the same factual and action rules as text chat.\n`;
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
      tools: PYPUS_TOOLS.map(({ name, description, parameters }) => ({ name, description, parametersJsonSchema: parameters })),
    });
  } catch (err) {
    console.error("pypus/live-session: failed to mint ephemeral token", err);
    return NextResponse.json({ error: "Couldn't start voice mode. Please try again shortly." }, { status: 502 });
  }
}
