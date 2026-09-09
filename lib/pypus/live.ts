/**
 * Shared between the server routes (app/api/pypus/live-session,
 * app/api/pypus/live-tool) and the browser voice hook
 * (hooks/usePypusVoice.ts). Kept free of server-only imports so the
 * client bundle can pull it in directly.
 */

/** Gemini's low-latency audio-to-audio model — native STT+TTS in one session. */
export const PYPUS_LIVE_MODEL = "gemini-3.1-flash-live-preview";

/** Gemini picks the spoken language automatically; this only steers transcription. */
export const PYPUS_LIVE_INPUT_LANGUAGE = "hi-IN";

/** Raw PCM in/out rates required by the Live API. */
export const PYPUS_LIVE_INPUT_SAMPLE_RATE = 16_000;
export const PYPUS_LIVE_OUTPUT_SAMPLE_RATE = 24_000;
