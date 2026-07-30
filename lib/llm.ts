/**
 * Provider-agnostic LLM call. Swapping providers means rewriting only this file.
 */
export async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const provider = process.env.LLM_PROVIDER || "openai";

  if (!apiKey) {
    throw new Error("LLM_API_KEY not set yet");
  }

  if (provider !== "openai") {
    throw new Error(`LLM_PROVIDER "${provider}" is not implemented in lib/llm.ts yet`);
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const reply = json?.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("LLM returned an empty response");
  }

  return reply.trim();
}
