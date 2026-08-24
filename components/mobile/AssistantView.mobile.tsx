'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, RotateCcw } from 'lucide-react'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { useWorkspace } from '@/hooks/useWorkspace'

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
    content: "Hello! I'm Pypus AI. I can help you manage your members, payments, and modules. How can I assist you today?",
    timestamp: '',
  },
]

const QUICK_PROMPTS = [
  'Kitne members due hain?',
  'Aaj ka attendance summary do',
  'Is mahine ka collection kitna hua?',
  'Konse members inactive hain?',
]

export function AssistantView({ workspaceSlug }: { workspaceSlug: string }) {
  const { workspace } = useWorkspace(workspaceSlug)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nextIdRef = useRef(INITIAL_MESSAGES.length + 1)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isTyping) return

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
      const res = await fetch('/api/pypus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace?.id, message: text }),
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

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES)
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface flex flex-col">
      <MobileTopBar
        title="Pypus AI"
        label=""
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
        action={
          <button
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <RotateCcw size={18} className="text-ve-primary" />
          </button>
        }
      />

      {/* Chat Canvas */}
      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-4 pb-56">
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <div key={m.id} className="flex items-end gap-3 max-w-[85%]">
              <div className="w-8 h-8 shrink-0 rounded-full bg-ve-secondary-container flex items-center justify-center text-white">
                <Bot size={16} />
              </div>
              <div className="bg-ve-surface-container-high rounded-2xl rounded-bl-none p-4 text-ve-on-surface text-sm leading-relaxed shadow-sm">
                <p>{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex flex-col items-end w-full space-y-1">
              <div className="max-w-[85%] bg-ve-primary-container text-ve-on-primary-container rounded-2xl rounded-br-none p-4 text-sm font-medium shadow-sm">
                <p>{m.content}</p>
              </div>
              {m.timestamp && (
                <span className="text-[10px] font-bold text-ve-on-surface-variant/50 mr-2">
                  Sent {m.timestamp}
                </span>
              )}
            </div>
          )
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-3 max-w-[85%]">
            <div className="w-8 h-8 shrink-0 rounded-full bg-ve-secondary-container/50 flex items-center justify-center text-white/70">
              <Bot size={16} />
            </div>
            <div className="bg-ve-surface-container-low rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 h-10">
              <div className="w-2 h-2 bg-ve-secondary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-ve-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-ve-secondary rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Floating Bottom Input Area */}
      <div className="fixed left-0 w-full z-40 bg-gradient-to-t from-ve-surface via-ve-surface/95 to-transparent pt-4" style={{ bottom: 'calc(72px + max(1rem, env(safe-area-inset-bottom)))' }}>
        {/* Quick Prompts */}
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar pb-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-4 py-2 bg-ve-surface-container-high border border-ve-outline-variant/30 rounded-full font-bold text-ve-on-surface-variant hover:bg-ve-primary-container hover:text-ve-on-primary-container hover:border-ve-primary-container transition-all text-xs active:scale-95 shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Text Input Box */}
        <div className="px-5 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl p-1.5 flex items-center gap-2 border-2 border-ve-outline-variant/40 focus-within:border-ve-primary transition-colors"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Pypus AI anything..."
              className="flex-1 bg-transparent border-none focus:ring-0 px-3 text-sm text-ve-on-surface placeholder:text-ve-on-surface-variant/40 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-xl bg-ve-primary flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-ve-primary/30 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}