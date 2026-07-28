'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'

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
      "Hello! I'm Pypus, your AI assistant. How can I assist you with your business operations, team management, or workflows today?",
    timestamp: '10:00 AM',
  },
  {
    id: '2',
    role: 'user',
    content: 'Can you summarize our team activity for this week?',
    timestamp: '10:01 AM',
  },
  {
    id: '3',
    role: 'assistant',
    content:
      'Certainly! Here is a summary of your workspace activity:\n• 14 automated workflows executed successfully\n• 4 active team members currently online\n• Overall system health: Optimal with 99.9% uptime',
    timestamp: '10:01 AM',
  },
]

const QUICK_PROMPTS = [
  'Summarize weekly metrics',
  'Check pending team approvals',
  'Draft customer welcome email',
  'Optimize current workflow',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: now,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your request: "${text}". As this is currently the UI shell, API integration will process this in the next release!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Assistant</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
              <Sparkles size={12} /> Pypus 1.0
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Ask Pypus anything about your business
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages(INITIAL_MESSAGES)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw size={13} /> Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shrink-0 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
            </div>

            <div
              className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm border shadow-xs ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white border-gray-900 rounded-tr-none'
                  : 'bg-white text-gray-800 border-gray-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>
              <p
                className={`text-[10px] mt-1.5 text-right ${
                  msg.role === 'user' ? 'text-gray-400' : 'text-gray-400'
                }`}
              >
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="relative flex items-center bg-white rounded-2xl border border-gray-200 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Pypus anything about your business..."
            className="flex-1 px-4 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
