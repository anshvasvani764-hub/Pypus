import { BUSINESS_BRAIN_SYSTEM_PROMPT } from "./prompt";
import { emptyDraft, type BusinessBrainChatResult, type BusinessBrainDraft } from "./types";

/**
 * Standalone Gemini caller for the Business Brain test agent.
 *
 * Deliberately NOT added to lib/llm.ts: that file is shared by the live
 * Pypus assistant/voice agent and this needs a different system prompt,
 * a JSON-only response mode, and its own conversation shape. Reuses the
 * same env vars (LLM_API_KEY, LLM_MODEL) so it stays on the same Gemini
 * model family as the rest of the app without a second config surface.
 */

export interface BusinessBrainHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

const GEMINI_MODEL = () => process.env.LLM_MODEL || "gemini-3-flash-preview";

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/** Finds the first balanced {...} block — a defensive fallback in case the
 *  model adds any stray text around the JSON despite instructions. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function coerceDraft(raw: unknown): BusinessBrainDraft {
  const base = emptyDraft();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const business = r.business as Record<string, unknown> | undefined;
  if (business && typeof business === "object") {
    base.business = {
      name: typeof business.name === "string" ? business.name : "",
      type: typeof business.type === "string" ? business.type : "",
      description: typeof business.description === "string" ? business.description : "",
    };
  }

  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  base.entities = arr(r.entities)
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      key: String(e.key ?? "").trim(),
      name: String(e.name ?? e.key ?? "").trim(),
      display_name: typeof e.display_name === "string" ? e.display_name : undefined,
      description: typeof e.description === "string" ? e.description : undefined,
      fields: arr(e.fields)
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .map((f) => ({
          key: String(f.key ?? "").trim(),
          label: String(f.label ?? f.key ?? "").trim(),
          description: typeof f.description === "string" ? f.description : undefined,
          data_type: typeof f.data_type === "string" ? f.data_type : "text",
          required: typeof f.required === "boolean" ? f.required : false,
          default_value: f.default_value ?? null,
          options: f.options ?? [],
          validation: f.validation ?? {},
        })),
    }))
    .filter((e) => e.key);

  base.relationships = arr(r.relationships)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      source_key: String(x.source_key ?? "").trim(),
      target_key: String(x.target_key ?? "").trim(),
      relationship_type: typeof x.relationship_type === "string" ? x.relationship_type : "related_to",
      source_label: typeof x.source_label === "string" ? x.source_label : undefined,
      target_label: typeof x.target_label === "string" ? x.target_label : undefined,
      config: x.config ?? {},
    }))
    .filter((x) => x.source_key && x.target_key);

  base.rules = arr(r.rules)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      name: String(x.name ?? "").trim(),
      description: typeof x.description === "string" ? x.description : undefined,
      rule_type: typeof x.rule_type === "string" ? x.rule_type : undefined,
      trigger: typeof x.trigger === "string" ? x.trigger : undefined,
      conditions: x.conditions ?? {},
      actions: x.actions ?? [],
      priority: typeof x.priority === "number" ? x.priority : 0,
    }))
    .filter((x) => x.name);

  base.workflows = arr(r.workflows)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      name: String(x.name ?? "").trim(),
      description: typeof x.description === "string" ? x.description : undefined,
      trigger: typeof x.trigger === "string" ? x.trigger : undefined,
      steps: x.steps ?? [],
    }))
    .filter((x) => x.name);

  base.terms = arr(r.terms)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      system_term: String(x.system_term ?? "").trim(),
      business_term: String(x.business_term ?? "").trim(),
      plural_term: typeof x.plural_term === "string" ? x.plural_term : undefined,
      description: typeof x.description === "string" ? x.description : undefined,
    }))
    .filter((x) => x.system_term && x.business_term);

  base.knowledge = arr(r.knowledge)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      category: String(x.category ?? "general").trim() || "general",
      title: String(x.title ?? "").trim(),
      content: String(x.content ?? "").trim(),
      metadata: x.metadata ?? {},
      source: typeof x.source === "string" ? x.source : "onboarding",
    }))
    .filter((x) => x.title && x.content);

  return base;
}

export async function callBusinessBrainLLM(
  userMessage: string,
  history: BusinessBrainHistoryTurn[]
): Promise<BusinessBrainChatResult> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY not set yet");
  }

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: BUSINESS_BRAIN_SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const json = await res.json();
  const text: string = (json?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");

  if (!text.trim()) {
    throw new Error("LLM returned an empty response");
  }

  const jsonText = extractJsonObject(stripCodeFences(text)) ?? stripCodeFences(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("MALFORMED_JSON");
  }

  const p = (parsed ?? {}) as Record<string, unknown>;
  return {
    reply: typeof p.reply === "string" && p.reply.trim() ? p.reply.trim() : "Samajh gaya.",
    readyToSave: p.readyToSave === true,
    draft: coerceDraft(p.draft),
  };
}
