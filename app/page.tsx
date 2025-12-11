'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Speak the response using TTS
      if (data.audioUrl) {
        setIsSpeaking(true)
        audioRef.current = new Audio(data.audioUrl)
        audioRef.current.onended = () => setIsSpeaking(false)
        audioRef.current.onerror = () => setIsSpeaking(false)
        audioRef.current.play()
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'My apologies, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputText)
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsSpeaking(false)
    }
  }

  return (
    <main className="min-h-screen relative wave-pattern">
      <WaveBackground />
      
      {/* Header */}
      <motion.header 
        className="relative z-10 pt-8 pb-4 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="inline-block mb-4"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <PhoenicianShip className="w-24 h-12 text-phoenician-gold ship-icon" />
          </motion.div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider text-phoenician-cream mb-2">
            <span className="text-phoenician-gold">P</span>HILO
          </h1>
          <p className="font-body text-xl text-phoenician-sand/80 italic">
            Wisdom from the scrolls of knowledge
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {['◆', '◇', '◆', '◇', '◆'].map((symbol, i) => (
              <span key={i} className="text-phoenician-bronze text-sm">{symbol}</span>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Chat Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pb-32">
        {/* Messages */}
        <div className="space-y-6 mb-8 min-h-[40vh]">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <div className="scroll-paper rounded-2xl p-8 max-w-md mx-auto gold-border">
                  <p className="font-body text-lg leading-relaxed">
                    Greetings, seeker of knowledge. I am <strong>Philo</strong>, your guide through the ancient wisdom of investment and decision-making.
                  </p>
                  <p className="font-body text-lg mt-4 leading-relaxed">
                    Speak or write your question, and I shall consult the scrolls.
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
                <div
                  className={`max-w-[80%] p-5 ${
                    message.role === 'user' ? 'message-user' : 'message-assistant'
                  }`}
                >
                  <p className="font-body text-lg leading-relaxed text-phoenician-cream">
                    {message.content}
                  </p>
                  <p className="text-xs text-phoenician-sand/60 mt-2 font-body">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
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
          <div className="flex gap-4 items-end">
            {/* Voice Button */}
            <motion.button
              type="button"
              onClick={toggleRecording}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
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
                placeholder="Speak or type your question..."
                className="w-full px-6 py-4 rounded-2xl bg-phoenician-navy/80 border-2 border-phoenician-bronze/50 
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
              className="flex-shrink-0 w-16 h-16 rounded-full btn-phoenician flex items-center justify-center
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
                className="flex-shrink-0 w-16 h-16 rounded-full bg-phoenician-wine border-2 border-phoenician-gold
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
    </main>
  )
}

