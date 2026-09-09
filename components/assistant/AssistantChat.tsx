'use client'

import { useEffect, useRef, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Bot, User, ArrowRight, Mic, Square } from 'lucide-react'
import { usePypusUIContext } from '@/context/PypusUIContext'
import { usePypusVoice } from '@/hooks/usePypusVoice'

interface NavigationSuggestion {
  route: string
  label: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  navigation?: NavigationSuggestion | null
}

/** Mirrors lib/pypus/tools/resolved-context.ts — kept in sync with the server's shape. */
interface ResolvedContext {
  entityType: 'member' | 'expense' | 'team_member'
  entityId: string
  entityName: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm Pypus, your AI assistant. Ask me about members, attendance, fees or pending reminders in this workspace.",
    timestamp: '',
  },
]

const QUICK_PROMPTS = [
  'Aaj ka attendance summary do',
  'Kitne fees pending hain?',
  'Is mahine ka collection kitna hua?',
]

function renderMessageContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    return <Fragment key={index}>{part}</Fragment>
  })
}

/**
 * Chat body only — no chrome (title bar / close / maximize). The caller
 * (full page or floating panel) is responsible for the surrounding frame.
 * Pass a different `key` from the parent to reset the conversation.
 */
export function AssistantChat({ workspaceId }: { workspaceId: string | null }) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nextIdRef = useRef(INITIAL_MESSAGES.length + 1)
  const resolvedContextRef = useRef<ResolvedContext | null>(null)
  const { uiContext } = usePypusUIContext()
  const router = useRouter()
  const workspaceSlug = uiContext.route.split('/').filter(Boolean)[0] ?? null

  const goToSuggestedPage = (nav: NavigationSuggestion) => {
    if (!workspaceSlug) return
    router.push(`/${workspaceSlug}${nav.route ? `/${nav.route}` : ''}`)
  }

  // A navigation suggestion can arrive (from a tool call) before the utterance
  // it belongs to has finished being transcribed — held here so it can be
  // attached to the right message once the assistant's turn actually flushes.
  const pendingNavRef = useRef<NavigationSuggestion | null>(null)

  const appendMessage = (role: Message['role'], content: string, navigation: NavigationSuggestion | null = null) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(nextIdRef.current++),
        role,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        navigation,
      },
    ])
  }

  const voice = usePypusVoice({
    workspaceId,
    getResolvedContext: () => resolvedContextRef.current,
    onResolvedContext: (ctx) => {
      resolvedContextRef.current = ctx
    },
    onNavigationSuggestion: (nav) => {
      pendingNavRef.current = nav
    },
    onUserUtterance: (text) => appendMessage('user', text),
    onAssistantUtterance: (text) => {
      appendMessage('assistant', text, pendingNavRef.current)
      pendingNavRef.current = null
    },
    onErrorMessage: (message) => appendMessage('assistant', message),
  })

  useEffect(() => {
    return () => voice.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isTyping || !workspaceId) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = {
      id: String(nextIdRef.current++),
      role: 'user',
      content: text,
      timestamp: now,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsTyping(true)

    let reply: string
    let navigation: NavigationSuggestion | null = null
    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/pypus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          message: text,
          history,
          resolvedContext: resolvedContextRef.current,
          uiContext,
        }),
      })
      const data = await res.json()
      reply =
        data.reply ??
        (res.status === 401
          ? 'Your session expired — please sign in again.'
          : 'Something went wrong. Please try again.')
      if ('resolvedContext' in data) resolvedContextRef.current = data.resolvedContext ?? null
      if (data.navigationSuggestion && typeof data.navigationSuggestion.route === 'string') {
        navigation = data.navigationSuggestion
      }
    } catch {
      reply = "I couldn't reach the server. Check your connection and try again."
    }

    setMessages((prev) => [
      ...prev,
      {
        id: String(nextIdRef.current++),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        navigation,
      },
    ])
    setIsTyping(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3 scrollbar-none">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isTyping || !workspaceId}
            className="shrink-0 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {prompt}
          </button>
        ))}
      </div>

      {voice.status !== 'idle' && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-gray-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          {voice.status === 'connecting' && 'Connect ho raha hai...'}
          {voice.status === 'listening' && 'Sun raha hoon...'}
          {voice.status === 'speaking' && 'Bol raha hoon...'}
          {voice.status === 'error' && 'Voice mode mein error aa gaya — mic dabao aur try karo'}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
            </div>

            <div
              className={`max-w-[82%] rounded-2xl border px-3.5 py-2.5 text-sm shadow-xs ${
                msg.role === 'user'
                  ? 'rounded-tr-none border-gray-900 bg-gray-900 text-white'
                  : 'rounded-tl-none border-gray-200 bg-white text-gray-800'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{renderMessageContent(msg.content)}</div>
              {msg.navigation && workspaceSlug && (
                <button
                  onClick={() => goToSuggestedPage(msg.navigation!)}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {msg.navigation.label}
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <Bot size={15} />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="shrink-0 border-t border-gray-100 p-3"
      >
        <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          <button
            type="button"
            onClick={() => (voice.status === 'idle' || voice.status === 'error' ? voice.start() : voice.stop())}
            disabled={!workspaceId}
            aria-label={voice.status === 'idle' || voice.status === 'error' ? 'Start voice mode' : 'Stop voice mode'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {voice.status === 'idle' || voice.status === 'error' ? <Mic size={17} /> : <Square size={15} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={workspaceId ? 'Ask Pypus anything...' : 'Loading workspace...'}
            disabled={!workspaceId}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || !workspaceId}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
