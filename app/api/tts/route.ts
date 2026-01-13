import { NextRequest, NextResponse } from 'next/server'
import { synthesizeSpeech, TTSProvider } from '@/lib/tts'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Use ElevenLabs by default, fallback to OpenAI if not configured
    const ttsProvider: TTSProvider = (process.env.TTS_PROVIDER as TTSProvider) || 'elevenlabs'
    
    const audioUrl = await synthesizeSpeech(text, ttsProvider)

    return NextResponse.json({
      audioUrl,
    })
  } catch (error) {
    console.error('TTS API Error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS generation failed' },
      { status: 500 }
    )
  }
}
