'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
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
    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/pypus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, message: text, history }),
      })
      const data = await res.json()
      reply =
        data.reply ??
        (res.status === 401
          ? 'Your session expired — please sign in again.'
          : 'Something went wrong. Please try again.')
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
              <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>
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
            className="shrink-0 rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
