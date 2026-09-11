/**
 * Shared between the server routes (app/api/pypus/live-session,
 * app/api/pypus/voice-tts) and the browser voice hook
 * (hooks/usePypusVoice.ts). Kept free of server-only imports so the
 * client bundle can pull it in directly.
 *
 * Architecture: the Live model is used ONLY for realtime speech-to-text.
 * It never reasons, never calls tools, and its own spoken output is
 * ignored entirely. The transcribed text is sent to the existing
 * /api/pypus/chat brain (same one the text UI uses), and the reply is
 * then synthesized separately via the one-shot TTS model below. This
 * keeps voice and text on exactly one brain, with zero chance of the
 * live session improvising an answer on its own.
 */

/** Gemini's low-latency audio-in model — used here purely for input transcription. */
export const PYPUS_LIVE_MODEL = "gemini-3.1-flash-live-preview";

/** One-shot text-to-speech model for speaking the chat brain's reply out loud. */
export const PYPUS_TTS_MODEL = "gemini-3.1-flash-tts-preview";

/** Prebuilt Gemini TTS voice. See Gemini TTS voice gallery for alternatives. */
export const PYPUS_TTS_VOICE = "Kore";

/** Gemini picks the spoken language automatically; this only steers transcription. */
export const PYPUS_LIVE_INPUT_LANGUAGE = "hi-IN";

/** Raw PCM in/out rates required by the Live API and the TTS model. */
export const PYPUS_LIVE_INPUT_SAMPLE_RATE = 16_000;
export const PYPUS_LIVE_OUTPUT_SAMPLE_RATE = 24_000;
export const PYPUS_TTS_OUTPUT_SAMPLE_RATE = 24_000;
