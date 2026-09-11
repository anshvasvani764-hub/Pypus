'use client'

import { useCallback, useRef, useState } from 'react'
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import {
  base64ToArrayBuffer,
  float32ToPCM16,
  pcm16ToFloat32,
  arrayBufferToBase64,
  resampleFloat32,
} from '@/lib/utils/pcm-audio'
import { PYPUS_TTS_OUTPUT_SAMPLE_RATE, PYPUS_LIVE_INPUT_SAMPLE_RATE } from '@/lib/pypus/live'
import type { ResolvedContext } from '@/lib/pypus/tools/resolved-context'
import { usePypusUIContext } from '@/context/PypusUIContext'

/**
 * ARCHITECTURE (rebuilt from scratch)
 * -----------------------------------
 * The Live model here is ONLY an ear. It has no tools, no business system
 * prompt, and its own spoken/text output is never used for anything — it
 * exists purely to turn the mic's audio into transcribed text via Gemini's
 * `inputAudioTranscription`.
 *
 * Once a user turn is transcribed, that plain text is sent to the SAME
 * /api/pypus/chat endpoint the text UI already uses (proven reliable), the
 * reply comes back as plain text, and that text is spoken out loud via a
 * separate one-shot TTS call (/api/pypus/voice-tts). There is exactly one
 * brain (the chat endpoint) for both text and voice; the Live session never
 * gets a chance to improvise, skip a tool, or answer in the wrong language,
 * because it is never asked to answer anything at all.
 */

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'

interface NavigationSuggestion {
  route: string
  label: string
}

interface UsePypusVoiceOptions {
  workspaceId: string | null
  getResolvedContext: () => ResolvedContext | null
  onResolvedContext: (ctx: ResolvedContext | null) => void
  onNavigationSuggestion: (nav: NavigationSuggestion) => void
  onUserUtterance: (text: string) => void
  onAssistantUtterance: (text: string) => void
  onErrorMessage: (message: string) => void
}

const TRANSCRIPT_FLUSH_IDLE_MS = 1500
const MAX_VOICE_HISTORY_TURNS = 8

type VoiceHistoryMessage = { role: 'user' | 'assistant'; content: string }

export function usePypusVoice(opts: UsePypusVoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const { uiContext } = usePypusUIContext()

  const sessionRef = useRef<Session | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const inputCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const outputCtxRef = useRef<AudioContext | null>(null)
  const playingSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const nextPlayAtRef = useRef(0)
  const inputBufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optsRef = useRef(opts)
  optsRef.current = opts
  const manualStopRef = useRef(false)
  const voiceHistoryRef = useRef<VoiceHistoryMessage[]>([])
  const turnPendingRef = useRef(false) // true while chat+TTS round-trip is in flight

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(finalizeUserTurn, TRANSCRIPT_FLUSH_IDLE_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearPlayback() {
    for (const src of playingSourcesRef.current) {
      try { src.stop() } catch {}
    }
    playingSourcesRef.current = []
    nextPlayAtRef.current = outputCtxRef.current?.currentTime ?? 0
  }

  function playChunk(base64: string) {
    const ctx = outputCtxRef.current
    if (!ctx) return
    const samples = pcm16ToFloat32(base64ToArrayBuffer(base64))
    const buffer = ctx.createBuffer(1, samples.length, PYPUS_TTS_OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const fadeGain = ctx.createGain()
    source.connect(fadeGain)
    fadeGain.connect(ctx.destination)
    const startAt = Math.max(nextPlayAtRef.current, ctx.currentTime)
    const FADE_S = 0.004 // 4ms fade — inaudible, kills boundary clicks
    const endAt = startAt + buffer.duration
    fadeGain.gain.setValueAtTime(0, startAt)
    fadeGain.gain.linearRampToValueAtTime(1, startAt + FADE_S)
    fadeGain.gain.setValueAtTime(1, Math.max(startAt + FADE_S, endAt - FADE_S))
    fadeGain.gain.linearRampToValueAtTime(0, endAt)
    source.start(startAt)
    nextPlayAtRef.current = endAt
    playingSourcesRef.current.push(source)
    source.onended = () => {
      playingSourcesRef.current = playingSourcesRef.current.filter((s) => s !== source)
      if (playingSourcesRef.current.length === 0) setStatus('listening')
    }
    setStatus('speaking')
  }

  /** Called once a user utterance is done (idle timeout or Live's own turn boundary). */
  async function finalizeUserTurn() {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    const userText = inputBufferRef.current.trim()
    inputBufferRef.current = ''
    if (!userText || turnPendingRef.current) return

    turnPendingRef.current = true
    optsRef.current.onUserUtterance(userText)
    setStatus('thinking')

    const { workspaceId, getResolvedContext, onResolvedContext, onNavigationSuggestion, onAssistantUtterance, onErrorMessage } =
      optsRef.current

    try {
      const history = voiceHistoryRef.current.slice(-MAX_VOICE_HISTORY_TURNS)
      const res = await fetch('/api/pypus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          message: userText,
          history,
          resolvedContext: getResolvedContext(),
          uiContext,
        }),
      })
      const data = await res.json()
      const reply: string =
        data.reply ??
        (res.status === 401
          ? 'Your session expired — please sign in again.'
          : 'Something went wrong. Please try again.')

      if ('resolvedContext' in data) onResolvedContext(data.resolvedContext ?? null)
      if (data.navigationSuggestion?.route) onNavigationSuggestion(data.navigationSuggestion)

      const newHistory: VoiceHistoryMessage[] = [
        ...voiceHistoryRef.current,
        { role: 'user', content: userText },
        { role: 'assistant', content: reply },
      ]
      voiceHistoryRef.current = newHistory.slice(-MAX_VOICE_HISTORY_TURNS)

      onAssistantUtterance(reply)
      await speak(reply)
    } catch (err) {
      console.error('pypus voice: chat brain call failed', err)
      onErrorMessage('Kuch gadbad ho gayi. Dobara boliye.')
      setStatus('listening')
    } finally {
      turnPendingRef.current = false
    }
  }

  async function speak(text: string) {
    try {
      const res = await fetch('/api/pypus/voice-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok || !data.audio) throw new Error(data.error || 'TTS failed')
      playChunk(data.audio)
    } catch (err) {
      console.error('pypus voice: tts failed', err)
      setStatus('listening')
    }
  }

  /**
   * Deliberately minimal: we only ever read `inputTranscription` (what the
   * user said) and `turnComplete` (when Gemini's VAD decided they stopped
   * talking). Anything the model itself says — text or audio — is ignored
   * on purpose; this session is not allowed to have an opinion.
   */
  function handleServerMessage(message: LiveServerMessage) {
    const content = message.serverContent
    if (content?.inputTranscription?.text) {
      inputBufferRef.current += content.inputTranscription.text
      scheduleFlush()
    }
    if (content?.turnComplete) void finalizeUserTurn()
  }

  const stop = useCallback(() => {
    manualStopRef.current = true
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    processorRef.current?.disconnect()
    processorRef.current = null
    inputCtxRef.current?.close().catch(() => {})
    inputCtxRef.current = null
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
    clearPlayback()
    outputCtxRef.current?.close().catch(() => {})
    outputCtxRef.current = null
    sessionRef.current?.close()
    sessionRef.current = null
    voiceHistoryRef.current = []
    inputBufferRef.current = ''
    turnPendingRef.current = false
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (!opts.workspaceId) return
    setStatus('connecting')
    voiceHistoryRef.current = []
    try {
      const sessionRes = await fetch('/api/pypus/live-session', { method: 'POST' })
      const sessionData = await sessionRes.json()
      if (!sessionRes.ok) throw new Error(sessionData.error || 'Could not start voice mode')

      const ai = new GoogleGenAI({ apiKey: sessionData.token, httpOptions: { apiVersion: 'v1alpha' } })
      const session = await ai.live.connect({
        model: sessionData.model,
        config: {
          responseModalities: [Modality.TEXT],
          systemInstruction: { parts: [{ text: sessionData.systemPrompt }] },
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => setStatus('listening'),
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            console.error('pypus voice: STT session error', e.message, e)
            optsRef.current.onErrorMessage('Voice session hit an error. Tap the mic to try again.')
            setStatus('error')
          },
          onclose: (e: CloseEvent) => {
            if (!manualStopRef.current) {
              console.error('pypus voice: STT session closed unexpectedly', e.code, e.reason)
              optsRef.current.onErrorMessage(
                e.reason
                  ? `Voice session band ho gaya: ${e.reason}. Tap the mic to try again.`
                  : 'Voice session achanak band ho gaya. Tap the mic to try again.'
              )
              setStatus('error')
            } else {
              setStatus('idle')
            }
            manualStopRef.current = false
          },
        },
      })
      sessionRef.current = session

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      const inputCtx = new AudioContext()
      inputCtxRef.current = inputCtx
      const source = inputCtx.createMediaStreamSource(stream)
      const processor = inputCtx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      processor.onaudioprocess = (e) => {
        const raw = e.inputBuffer.getChannelData(0)
        const resampled = resampleFloat32(raw, inputCtx.sampleRate, PYPUS_LIVE_INPUT_SAMPLE_RATE)
        const pcm = float32ToPCM16(resampled)
        sessionRef.current?.sendRealtimeInput({
          audio: { data: arrayBufferToBase64(pcm), mimeType: `audio/pcm;rate=${PYPUS_LIVE_INPUT_SAMPLE_RATE}` },
        })
      }
      const silentGain = inputCtx.createGain()
      silentGain.gain.value = 0
      source.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(inputCtx.destination)

      const outputCtx = new AudioContext()
      outputCtxRef.current = outputCtx
      nextPlayAtRef.current = 0
    } catch (err) {
      console.error('pypus voice: failed to start', err)
      optsRef.current.onErrorMessage(err instanceof Error ? err.message : 'Could not start voice mode.')
      stop()
      setStatus('error')
    }
  }, [opts.workspaceId, stop])

  return { status, start, stop }
}
