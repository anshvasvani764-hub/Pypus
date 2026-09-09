'use client'

import { useCallback, useRef, useState } from 'react'
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  float32ToPCM16,
  pcm16ToFloat32,
  resampleFloat32,
} from '@/lib/utils/pcm-audio'
import { PYPUS_LIVE_OUTPUT_SAMPLE_RATE, PYPUS_LIVE_INPUT_SAMPLE_RATE } from '@/lib/pypus/live'
import type { ResolvedContext } from '@/lib/pypus/tools/resolved-context'
import { usePypusUIContext } from '@/context/PypusUIContext'

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

interface NavigationSuggestion {
  route: string
  label: string
}

interface UsePypusVoiceOptions {
  workspaceId: string | null
  /** Read the latest resolvedContext at call time — always the current value, not a stale closure. */
  getResolvedContext: () => ResolvedContext | null
  onResolvedContext: (ctx: ResolvedContext | null) => void
  onNavigationSuggestion: (nav: NavigationSuggestion) => void
  onUserUtterance: (text: string) => void
  onAssistantUtterance: (text: string) => void
  onErrorMessage: (message: string) => void
}

const TRANSCRIPT_FLUSH_IDLE_MS = 2000
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
  const outputBufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optsRef = useRef(opts)
  optsRef.current = opts
  const manualStopRef = useRef(false)
  const voiceHistoryRef = useRef<VoiceHistoryMessage[]>([])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(flushTranscripts, TRANSCRIPT_FLUSH_IDLE_MS)
  }, [])

  function flushTranscripts() {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    const userText = inputBufferRef.current.trim()
    const assistantText = outputBufferRef.current.trim()
    inputBufferRef.current = ''
    outputBufferRef.current = ''
    if (userText) optsRef.current.onUserUtterance(userText)
    if (assistantText) optsRef.current.onAssistantUtterance(assistantText)
  }

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
    const buffer = ctx.createBuffer(1, samples.length, PYPUS_LIVE_OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const startAt = Math.max(nextPlayAtRef.current, ctx.currentTime)
    source.start(startAt)
    nextPlayAtRef.current = startAt + buffer.duration
    playingSourcesRef.current.push(source)
    source.onended = () => {
      playingSourcesRef.current = playingSourcesRef.current.filter((s) => s !== source)
      if (playingSourcesRef.current.length === 0) setStatus('listening')
    }
    setStatus('speaking')
  }

  async function handleToolCall(toolCall: NonNullable<LiveServerMessage['toolCall']>) {
    const session = sessionRef.current
    if (!session) return
    const { workspaceId, getResolvedContext, onResolvedContext, onNavigationSuggestion } = optsRef.current

    const functionResponses = await Promise.all(
      (toolCall.functionCalls ?? []).map(async (fc) => {
        try {
          const res = await fetch('/api/pypus/live-tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              name: fc.name,
              args: fc.args ?? {},
              resolvedContext: getResolvedContext(),
              uiContext,
              history: voiceHistoryRef.current.slice(-MAX_VOICE_HISTORY_TURNS),
            }),
          })
          const data = await res.json()
          onResolvedContext(data.resolvedContext ?? null)
          if (data.navigationSuggestion?.route) onNavigationSuggestion(data.navigationSuggestion)

          const reply = data.result?.reply
          const query = (fc.args as Record<string, unknown> | undefined)?.query
          if (fc.name === 'pypus_brain' && typeof query === 'string' && typeof reply === 'string') {
            const newHistory: VoiceHistoryMessage[] = [
              ...voiceHistoryRef.current,
              { role: 'user', content: query },
              { role: 'assistant', content: reply },
            ]
            voiceHistoryRef.current = newHistory.slice(-MAX_VOICE_HISTORY_TURNS)
          }

          return { id: fc.id, name: fc.name, response: { result: data.result } }
        } catch (err) {
          console.error('pypus voice: tool call failed', fc.name, err)
          return { id: fc.id, name: fc.name, response: { result: { error: 'Tool call failed.' } } }
        }
      })
    )

    session.sendToolResponse({ functionResponses })
  }

  function handleServerMessage(message: LiveServerMessage) {
    const content = message.serverContent
    if (content?.interrupted) {
      clearPlayback()
      flushTranscripts()
      setStatus('listening')
    }
    if (content?.inputTranscription?.text) {
      inputBufferRef.current += content.inputTranscription.text
      scheduleFlush()
    }
    if (content?.outputTranscription?.text) {
      outputBufferRef.current += content.outputTranscription.text
      scheduleFlush()
    }
    const parts = content?.modelTurn?.parts ?? []
    for (const part of parts) {
      if (part.inlineData?.data) playChunk(part.inlineData.data)
    }
    if (content?.turnComplete) flushTranscripts()
    if (message.toolCall) void handleToolCall(message.toolCall)
  }

  const stop = useCallback(() => {
    manualStopRef.current = true
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTranscripts()
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
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (!opts.workspaceId) return
    setStatus('connecting')
    voiceHistoryRef.current = []
    try {
      const sessionRes = await fetch('/api/pypus/live-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uiContext,
          resolvedContext: optsRef.current.getResolvedContext(),
        }),
      })
      const sessionData = await sessionRes.json()
      if (!sessionRes.ok) throw new Error(sessionData.error || 'Could not start voice mode')

      const ai = new GoogleGenAI({ apiKey: sessionData.token, httpOptions: { apiVersion: 'v1alpha' } })
      const session = await ai.live.connect({
        model: sessionData.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: sessionData.systemPrompt }] },
          tools: [{ functionDeclarations: sessionData.tools }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => setStatus('listening'),
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            console.error('pypus voice: session error', e.message, e)
            optsRef.current.onErrorMessage("Voice session hit an error. Tap the mic to try again.")
            setStatus('error')
          },
          onclose: (e: CloseEvent) => {
            if (!manualStopRef.current) {
              console.error('pypus voice: session closed unexpectedly', e.code, e.reason)
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
  }, [opts.workspaceId, uiContext, stop])

  return { status, start, stop }
}
