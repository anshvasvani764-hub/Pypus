import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { PYPUS_LIVE_MODEL } from "@/lib/pypus/live";

/**
 * This session is a pure speech-to-text transport. It has no tools and no
 * business system prompt — it never reasons about the request and its own
 * spoken output is discarded by the client. The transcribed text is sent
 * separately to /api/pypus/chat (the same brain the text UI uses), and the
 * reply is synthesized by /api/pypus/voice-tts. Keeping this session this
 * dumb is intentional: a model with tools/reasoning here was free to answer
 * without calling anything, which is what caused the old wrong-language,
 * infinite-retry, empty-audio bugs.
 */
const STT_ONLY_SYSTEM_PROMPT =
  "You are a silent microphone. Do not speak, do not respond, do not comment. Just listen.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Voice mode isn't configured yet — add LLM_API_KEY in .env.local" }, { status: 503 });

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
          // This model only supports AUDIO responseModalities (TEXT-only is
          // rejected). We never read the model's own audio output anyway —
          // see hooks/usePypusVoice.ts, which only consumes inputTranscription.
          config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {} },
        },
      },
    });
    return NextResponse.json({
      token: token.name,
      model: PYPUS_LIVE_MODEL,
      systemPrompt: STT_ONLY_SYSTEM_PROMPT,
    });
  } catch (err) {
    console.error("pypus/live-session: failed to mint ephemeral token", err);
    return NextResponse.json({ error: "Couldn't start voice mode. Please try again shortly." }, { status: 502 });
  }
}
