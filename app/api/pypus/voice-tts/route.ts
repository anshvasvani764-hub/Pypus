import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PYPUS_TTS_MODEL, PYPUS_TTS_VOICE } from "@/lib/pypus/live";

/**
 * One-shot text-to-speech. Takes the chat brain's finished reply text and
 * returns spoken audio for it — no reasoning, no tools, nothing that can
 * go wrong beyond "did the audio come back". Kept completely separate from
 * the live STT session so a TTS hiccup can never affect transcription and
 * vice versa.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Voice mode isn't configured yet." }, { status: 503 });

  let text: string;
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "No text to speak." }, { status: 400 });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${PYPUS_TTS_MODEL}:generateContent`,
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
    if (!res.ok) {
      const errText = await res.text();
      console.error("pypus/voice-tts: TTS request failed", res.status, errText.slice(0, 300));
      return NextResponse.json({ error: "Couldn't generate speech." }, { status: 502 });
    }
    const data = await res.json();
    const audio: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audio) {
      console.error("pypus/voice-tts: no audio in TTS response", JSON.stringify(data).slice(0, 300));
      return NextResponse.json({ error: "No speech generated." }, { status: 502 });
    }
    return NextResponse.json({ audio });
  } catch (err) {
    console.error("pypus/voice-tts: unexpected error", err);
    return NextResponse.json({ error: "Couldn't generate speech." }, { status: 502 });
  }
}
