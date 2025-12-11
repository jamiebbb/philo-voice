# 🚢 Philo - Voice Knowledge Assistant

> *Wisdom from the scrolls of knowledge*

Philo is a Phoenician-inspired voice chatbot that connects to OpenAI's Responses API with file search capabilities. Ask questions through voice or text, and Philo will consult your knowledge base of books and documents to provide insightful answers.

![Philo Preview](https://via.placeholder.com/800x400/0D1821/D4AF37?text=Philo+Voice+Assistant)

## ✨ Features

- **Voice Input** - Speak your questions using the Web Speech API
- **AI Responses** - Powered by GPT-4o with file search capabilities
- **Text-to-Speech** - Hear responses spoken aloud (modular: OpenAI TTS or ElevenLabs)
- **Live Transcription** - See both your questions and AI responses as text
- **Knowledge Base** - Queries a vector store of books and documents
- **Beautiful UI** - Phoenician-inspired design with animations

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **AI**: OpenAI Responses API with file search
- **TTS**: OpenAI TTS (with ElevenLabs ready for integration)
- **STT**: Web Speech API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key with access to GPT-4o and TTS

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd philo-voice
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Add your OpenAI API key to `.env.local`:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `TTS_PROVIDER` | No | TTS provider: `openai` (default) or `elevenlabs` |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key (if using ElevenLabs) |
| `ELEVENLABS_VOICE_ID` | No | Custom ElevenLabs voice ID |

### Switching TTS Providers

The TTS system is modular. To switch from OpenAI to ElevenLabs:

1. Get an API key from [ElevenLabs](https://elevenlabs.io)
2. Add to your environment:
   ```
   TTS_PROVIDER=elevenlabs
   ELEVENLABS_API_KEY=your-key-here
   ```

## 📚 Knowledge Base

Philo connects to a vector store containing your documents. The current setup uses:

- **Vector Store ID**: `vs_67f55053de9c8191a46b2a3a553a011d`

To update the knowledge base, upload PDFs to OpenAI's file storage and add them to the vector store.

## 🎨 Design

The UI features a Phoenician-inspired aesthetic:
- Deep navy and terracotta color palette
- Gold accents reminiscent of ancient trade goods
- Wave animations celebrating Phoenician seafaring heritage
- Cinzel and Cormorant Garamond fonts for a scholarly feel
- Scroll-paper effect for the welcome message

## 📁 Project Structure

```
philo-voice/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # OpenAI Responses API endpoint
│   ├── globals.css           # Tailwind + custom styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main chat interface
├── lib/
│   └── tts/
│       ├── index.ts          # TTS service router
│       ├── openai.ts         # OpenAI TTS implementation
│       └── elevenlabs.ts     # ElevenLabs TTS implementation
├── types/
│   └── speech.d.ts           # Web Speech API types
└── ...config files
```

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your environment variables in Vercel's dashboard
4. Deploy!

## 📄 License

MIT

---

*Built with ⚓ by seekers of wisdom*

