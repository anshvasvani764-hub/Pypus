import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { PYPUS_TOOLS } from "@/lib/pypus/tools";
import { PYPUS_SYSTEM_PROMPT } from "@/lib/pypus/prompt";
import { PYPUS_LIVE_MODEL } from "@/lib/pypus/live";

/**
 * Mints a one-use, short-lived Gemini token so the browser can open a
 * Live API WebSocket directly (voice mode in AssistantChat) without ever
 * seeing the real API key. Locked to PYPUS_LIVE_MODEL + audio-only so a
 * leaked token can't be replayed against a pricier model/config.
 *
 * Also hands back the exact same system prompt and tool declarations the
 * text chat (app/api/pypus/chat) uses, so voice mode answers from the same
 * "brain" — only the transport (typed text vs. live audio) differs. Tool
 * *execution* still happens server-side, one call at a time, via
 * app/api/pypus/live-tool.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice mode isn't configured yet — add LLM_API_KEY in .env.local" },
      { status: 503 }
    );
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
          // Must mirror what the browser passes to ai.live.connect() below —
          // an ephemeral token with no locked config defaults to TEXT-only,
          // which the audio-native live model rejects outright, killing the
          // session right after it opens ("response modalities (TEXT) not
          // supported"). Locking it here keeps the token's constraint and
          // the client's actual connect config in agreement.
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });

    return NextResponse.json({
      token: token.name,
      model: PYPUS_LIVE_MODEL,
      systemPrompt: PYPUS_SYSTEM_PROMPT,
      // Send as parametersJsonSchema, NOT parameters — PYPUS_TOOLS schemas are
      // plain JSON Schema (lowercase "object"/"string"/...), and Live API's
      // FunctionDeclaration.parameters expects Google's own uppercase Schema
      // type (Type.OBJECT etc). Mixing the two silently breaks tool
      // registration on the Live session, so the model has no working tools
      // and falls back to "I don't have access to that."
      tools: PYPUS_TOOLS.map(({ name, description, parameters }) => ({
        name,
        description,
        parametersJsonSchema: parameters,
      })),
    });
  } catch (err) {
    console.error("pypus/live-session: failed to mint ephemeral token", err);
    return NextResponse.json({ error: "Couldn't start voice mode. Please try again shortly." }, { status: 502 });
  }
}
