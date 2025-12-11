'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

interface Chat {
  id: string
  name: string
  threadId: string | null
  messages: Message[]
  createdAt: Date
}

// Simple markdown parser for bold text
function parseMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

// Phoenician-inspired ship SVG component
const PhoenicianShip = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 120 60" className={className} fill="currentColor">
    <path d="M10 45 Q30 55 60 55 Q90 55 110 45 L105 50 Q60 60 15 50 Z" />
    <path d="M20 45 L25 20 L30 20 L30 45" />
    <path d="M25 20 Q50 15 75 20 L75 35 Q50 30 25 35 Z" opacity="0.8" />
    <path d="M60 45 L60 10 L65 10 L65 45" />
    <path d="M62 10 L95 25 L62 30 Z" opacity="0.9" />
    <circle cx="85" cy="48" r="3" />
    <circle cx="35" cy="48" r="3" />
  </svg>
)

// Wave animation component
const WaveBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg className="absolute bottom-0 w-full h-48 opacity-20" viewBox="0 0 1440 320" preserveAspectRatio="none">
      <motion.path
        d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,224C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        fill="url(#wave-gradient)"
        animate={{
          d: [
            "M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,224C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            "M0,128L48,149.3C96,171,192,213,288,224C384,235,480,213,576,186.7C672,160,768,128,864,138.7C960,149,1056,203,1152,213.3C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <defs>
        <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2E5266" />
          <stop offset="100%" stopColor="#1B2838" />
        </linearGradient>
      </defs>
    </svg>
  </div>
)

// Microphone icon
const MicrophoneIcon = ({ isRecording }: { isRecording: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
    <motion.path
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      animate={isRecording ? { stroke: ['#D4AF37', '#C84B31', '#D4AF37'] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

// Storage keys
const STORAGE_KEY = 'philo-chats'

// Load chats from localStorage
function loadChats(): Chat[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const chats = JSON.parse(stored)
      return chats.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        messages: chat.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }))
    }
  } catch (e) {
    console.error('Failed to load chats:', e)
  }
  return []
}

// Save chats to localStorage
function saveChats(chats: Chat[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  } catch (e) {
    console.error('Failed to save chats:', e)
  }
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Get active chat
  const activeChat = chats.find(c => c.id === activeChatId) || null
  const messages = activeChat?.messages || []

  // Load chats from localStorage on mount
  useEffect(() => {
    const loaded = loadChats()
    if (loaded.length > 0) {
      setChats(loaded)
      setActiveChatId(loaded[0].id)
    }
  }, [])

  // Save chats whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      saveChats(chats)
    }
  }, [chats])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('')
          setInputText(transcript)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
        }
      }
    }
  }, [])

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `Chat ${chats.length + 1}`,
      threadId: null,
      messages: [],
      createdAt: new Date()
    }
    setChats(prev => [newChat, ...prev])
    setActiveChatId(newChat.id)
    setShowSidebar(false)
  }, [chats.length])

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== chatId)
      if (activeChatId === chatId) {
        setActiveChatId(filtered.length > 0 ? filtered[0].id : null)
      }
      if (filtered.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
      }
      return filtered
    })
  }, [activeChatId])

  const clearChat = useCallback((chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages: [], threadId: null }
        : chat
    ))
  }, [])

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      setInputText('')
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }, [isRecording])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    // Create a new chat if none exists
    let currentChatId = activeChatId
    if (!currentChatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        name: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
        threadId: null,
        messages: [],
        createdAt: new Date()
      }
      setChats(prev => [newChat, ...prev])
      setActiveChatId(newChat.id)
      currentChatId = newChat.id
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    // Update chat with user message
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            name: chat.messages.length === 0 ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : chat.name
          }
        : chat
    ))
    
    setInputText('')
    setIsLoading(true)

    try {
      const currentChat = chats.find(c => c.id === currentChatId)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text.trim(),
          threadId: currentChat?.threadId || null
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sources: data.sources,
      }

      // Update chat with assistant message and thread ID
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages.filter(m => m.id !== userMessage.id), userMessage, assistantMessage],
              threadId: data.threadId || chat.threadId
            }
          : chat
      ))

      // Speak the response using client-side TTS (Web Speech API)
      if (voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(data.response)
        utterance.rate = 1.0
        utterance.pitch = 1.0
        
        // Try to find a good female voice
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice = voices.find(v => 
          v.name.includes('Samantha') || // macOS
          v.name.includes('Microsoft Zira') || // Windows
          v.name.includes('Google UK English Female') || // Chrome
          (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
        ) || voices.find(v => v.lang.startsWith('en'))
        
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }
        
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)
        
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputText)
  }

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }
  
  const toggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking()
    }
    setVoiceEnabled(prev => !prev)
  }

  return (
    <main className="min-h-screen relative wave-pattern flex">
      <WaveBackground />
      
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed inset-y-0 left-0 z-30 w-72 bg-phoenician-deep/95 border-r border-phoenician-bronze/30 
                     backdrop-blur-sm flex flex-col"
          >
            <div className="p-4 border-b border-phoenician-bronze/30">
              <button
                onClick={createNewChat}
                className="w-full py-3 px-4 rounded-xl bg-phoenician-terracotta/20 border border-phoenician-terracotta/50
                         hover:bg-phoenician-terracotta/30 transition-colors flex items-center gap-2 justify-center
                         text-phoenician-cream font-body"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer mb-1 transition-colors
                            ${chat.id === activeChatId 
                              ? 'bg-phoenician-sea/40 border border-phoenician-bronze/30' 
                              : 'hover:bg-phoenician-navy/50'}`}
                  onClick={() => { setActiveChatId(chat.id); setShowSidebar(false) }}
                >
                  <span className="flex-1 truncate text-phoenician-cream/90 font-body">
                    {chat.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearChat(chat.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-phoenician-wine/50 rounded transition-all"
                    title="Clear chat"
                  >
                    <svg className="w-4 h-4 text-phoenician-sand/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-phoenician-wine/50 rounded transition-all"
                    title="Delete chat"
                  >
                    <svg className="w-4 h-4 text-phoenician-sand/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {chats.length === 0 && (
                <p className="text-center text-phoenician-sand/50 font-body py-8">
                  No chats yet
                </p>
              )}
            </div>
            
            <button
              onClick={() => setShowSidebar(false)}
              className="p-4 border-t border-phoenician-bronze/30 text-phoenician-sand/70 hover:text-phoenician-cream
                       transition-colors font-body"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sidebar overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.header 
          className="relative z-10 pt-6 pb-4 px-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 rounded-lg hover:bg-phoenician-navy/50 transition-colors"
              >
                <svg className="w-6 h-6 text-phoenician-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <PhoenicianShip className="w-16 h-8 text-phoenician-gold ship-icon" />
                </motion.div>
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider text-phoenician-cream">
                  <span className="text-phoenician-gold">P</span>HILO
                </h1>
              </div>
              
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-phoenician-sea/50' : 'hover:bg-phoenician-navy/50'}`}
                title={voiceEnabled ? 'Voice on' : 'Voice off'}
              >
                {voiceEnabled ? (
                  <svg className="w-6 h-6 text-phoenician-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-phoenician-sand/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>
              <button
                onClick={createNewChat}
                className="p-2 rounded-lg hover:bg-phoenician-navy/50 transition-colors"
                title="New chat"
              >
                <svg className="w-6 h-6 text-phoenician-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            <p className="font-body text-lg text-phoenician-sand/80 text-center">
              Your research assistant
            </p>
          </div>
        </motion.header>

        {/* Chat Container */}
        <div className="flex-1 relative z-10 max-w-4xl mx-auto w-full px-4 pb-32 overflow-y-auto">
          {/* Messages */}
          <div className="space-y-6 mb-8 min-h-[40vh]">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16"
                >
                  <div className="scroll-paper rounded-2xl p-8 max-w-md mx-auto gold-border">
                    <p className="font-body text-lg leading-relaxed">
                      Hi! I&apos;m <strong>Philo</strong>, your research assistant.
                    </p>
                    <p className="font-body text-lg mt-4 leading-relaxed">
                      Ask me anything - I can search through books and documents to help find answers.
                    </p>
                  </div>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}>
                    <div className="p-5">
                      <p className="font-body text-lg leading-relaxed text-phoenician-cream whitespace-pre-wrap">
                        {parseMarkdown(message.content)}
                      </p>
                      
                      {/* Source references */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-phoenician-gold/80 font-body">
                            📚 Sources: {message.sources.join(', ')}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-phoenician-sand/60 mt-2 font-body">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="message-assistant p-5">
                  <div className="flex gap-2">
                    <span className="loading-dot w-2 h-2 bg-phoenician-gold rounded-full"></span>
                    <span className="loading-dot w-2 h-2 bg-phoenician-gold rounded-full"></span>
                    <span className="loading-dot w-2 h-2 bg-phoenician-gold rounded-full"></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-phoenician-deep via-phoenician-deep to-transparent pt-8 pb-6 px-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              {/* Voice Button */}
              <motion.button
                type="button"
                onClick={toggleRecording}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? 'bg-phoenician-terracotta recording-active gold-glow'
                    : 'bg-phoenician-navy hover:bg-phoenician-sea border-2 border-phoenician-bronze'
                }`}
              >
                <MicrophoneIcon isRecording={isRecording} />
              </motion.button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full px-5 py-4 rounded-2xl bg-phoenician-navy/80 border-2 border-phoenician-bronze/50 
                           text-phoenician-cream placeholder-phoenician-sand/50 font-body text-lg
                           focus:outline-none focus:border-phoenician-gold focus:ring-2 focus:ring-phoenician-gold/30
                           transition-all duration-300"
                  disabled={isLoading}
                />
              </div>

              {/* Send Button */}
              <motion.button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-14 h-14 rounded-full btn-phoenician flex items-center justify-center
                         disabled:opacity-50 disabled:cursor-not-allowed text-phoenician-cream"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </motion.button>

              {/* Stop Speaking Button */}
              {isSpeaking && (
                <motion.button
                  type="button"
                  onClick={stopSpeaking}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-14 h-14 rounded-full bg-phoenician-wine border-2 border-phoenician-gold
                           flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </motion.button>
              )}
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-phoenician-terracotta font-body mt-3"
              >
                ● Listening...
              </motion.p>
            )}
          </form>
        </motion.div>
      </div>
    </main>
  )
}
