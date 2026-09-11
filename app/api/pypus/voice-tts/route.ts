import { createClient } from "@/lib/supabase/server";
import { PYPUS_TTS_MODEL, PYPUS_TTS_VOICE } from "@/lib/pypus/live";

/**
 * Streaming text-to-speech. Proxies Gemini's :streamGenerateContent SSE
 * response through as newline-delimited JSON ({"audio": base64}\n per
 * chunk) so the client can start playing the first chunk the moment it
 * arrives instead of waiting for the whole reply to finish synthesizing —
 * a one-shot call here was adding several seconds of dead air before the
 * agent started speaking.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return Response.json({ error: "Voice mode isn't configured yet." }, { status: 503 });

  let text: string;
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  if (!text) return Response.json({ error: "No text to speak." }, { status: 400 });

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${PYPUS_TTS_MODEL}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: PYPUS_TTS_VOICE } },
            },
          },
        }),
      }
    );
  } catch (err) {
    console.error("pypus/voice-tts: upstream request failed", err);
    return Response.json({ error: "Couldn't generate speech." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    console.error("pypus/voice-tts: TTS stream failed", upstream.status, errText.slice(0, 300));
    return Response.json({ error: "Couldn't generate speech." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const upstreamBody = upstream.body;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      let buffer = "";
      let sawAudio = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const audio: string | undefined = parsed?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (audio) {
                sawAudio = true;
                controller.enqueue(encoder.encode(JSON.stringify({ audio }) + "\n"));
              }
            } catch {
              // Ignore malformed SSE lines — a dropped chunk isn't fatal here.
            }
          }
        }
      } catch (err) {
        console.error("pypus/voice-tts: stream read error", err);
      } finally {
        if (!sawAudio) controller.enqueue(encoder.encode(JSON.stringify({ error: "No speech generated." }) + "\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
