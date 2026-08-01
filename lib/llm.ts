export interface LLMToolSpec {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export type LLMToolRunner = (name: string, args: Record<string, unknown>) => Promise<unknown>;

const MAX_TOOL_ROUNDS = 4;

/**
 * Provider-agnostic LLM call. Swapping providers means rewriting only this file.
 */
export async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const provider = process.env.LLM_PROVIDER || "openai";

  if (!apiKey) {
    throw new Error("LLM_API_KEY not set yet");
  }

  switch (provider) {
    case "gemini":
      return callGemini(apiKey, systemPrompt, userMessage);
    case "openai":
      return callOpenAI(apiKey, systemPrompt, userMessage);
    default:
      throw new Error(`LLM_PROVIDER "${provider}" is not implemented in lib/llm.ts yet`);
  }
}

/**
 * Same as callLLM but lets the model fetch real data through tools before answering,
 * so it never has to guess a number.
 */
export async function callLLMWithTools(
  systemPrompt: string,
  userMessage: string,
  tools: LLMToolSpec[],
  runTool: LLMToolRunner
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const provider = process.env.LLM_PROVIDER || "openai";

  if (!apiKey) {
    throw new Error("LLM_API_KEY not set yet");
  }

  switch (provider) {
    case "gemini":
      return geminiToolLoop(apiKey, systemPrompt, userMessage, tools, runTool);
    case "openai":
      return openAIToolLoop(apiKey, systemPrompt, userMessage, tools, runTool);
    default:
      throw new Error(`LLM_PROVIDER "${provider}" is not implemented in lib/llm.ts yet`);
  }
}

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string) {
  const model = GEMINI_MODEL();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const json = await res.json();
  const reply = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");

  return requireText(reply);
}

async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string) {
  const res = await fetch(OPENAI_URL(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const json = await res.json();
  return requireText(json?.choices?.[0]?.message?.content);
}

function requireText(reply: unknown): string {
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("LLM returned an empty response");
  }
  return reply.trim();
}

// ── tool-calling loops ────────────────────────────────────────────

const GEMINI_MODEL = () => process.env.LLM_MODEL || "gemini-3-flash-preview";
const OPENAI_MODEL = () => process.env.LLM_MODEL || "gpt-4o-mini";
/** OpenRouter and other OpenAI-compatible gateways only differ by base URL. */
const OPENAI_URL = () =>
  `${(process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

async function geminiToolLoop(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  tools: LLMToolSpec[],
  runTool: LLMToolRunner
): Promise<string> {
  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: round < MAX_TOOL_ROUNDS ? [{ functionDeclarations: tools }] : undefined,
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }

    const json = await res.json();
    const parts: GeminiPart[] = json?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!);

    if (!calls.length) {
      return requireText(parts.map((p) => p.text ?? "").join(""));
    }

    contents.push({ role: "model", parts });
    contents.push({
      role: "user",
      parts: await Promise.all(
        calls.map(async (call) => ({
          functionResponse: {
            name: call.name,
            response: { result: await runTool(call.name, call.args ?? {}) },
          },
        }))
      ),
    });
  }

  throw new Error("LLM returned an empty response");
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

async function openAIToolLoop(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  tools: LLMToolSpec[],
  runTool: LLMToolRunner
): Promise<string> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await fetch(OPENAI_URL(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL(),
        messages,
        temperature: 0,
        tools:
          round < MAX_TOOL_ROUNDS
            ? tools.map((t) => ({
                type: "function",
                function: { name: t.name, description: t.description, parameters: t.parameters },
              }))
            : undefined,
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }

    const json = await res.json();
    const choice = json?.choices?.[0]?.message;
    const calls: OpenAIToolCall[] = choice?.tool_calls ?? [];

    if (!calls.length) {
      return requireText(choice?.content);
    }

    messages.push(choice);
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(await runTool(call.function.name, args)),
      });
    }
  }

  throw new Error("LLM returned an empty response");
}
