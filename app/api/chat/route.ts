import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { synthesizeSpeech, TTSProvider } from '@/lib/tts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VECTOR_STORE_ID = 'vs_67f55053de9c8191a46b2a3a553a011d'

const SYSTEM_PROMPT = `You are Philo, a wise and eloquent research assistant with a flair for ancient wisdom. You have access to a vector store containing a curated library of books spanning investment philosophy, decision-making frameworks, psychology, and other fields of knowledge.

When answering:
- Prefer information from the files in your knowledge base and quote or reference them where useful
- Speak with warmth and depth, as a learned scholar sharing insights
- Be concise but thorough - like a sage who values both brevity and completeness
- If the question is outside the scope of your knowledge base, draw on your general wisdom while being transparent about the source
- When referencing books or texts, mention the title and author when available

Remember: You are a guide on the seeker's journey to understanding.`

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Use the Responses API with file search
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: message,
      instructions: SYSTEM_PROMPT,
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [VECTOR_STORE_ID],
        },
      ],
    })

    // Extract the text response
    const textOutput = response.output.find(
      (item: any) => item.type === 'text'
    ) as { type: 'text'; text: string } | undefined

    const responseText = textOutput?.text || 'I could not formulate a response. Please try again.'

    // Generate TTS audio
    let audioUrl: string | null = null
    try {
      const ttsProvider: TTSProvider = (process.env.TTS_PROVIDER as TTSProvider) || 'openai'
      audioUrl = await synthesizeSpeech(responseText, ttsProvider)
    } catch (ttsError) {
      console.error('TTS Error:', ttsError)
      // Continue without audio if TTS fails
    }

    return NextResponse.json({
      response: responseText,
      audioUrl,
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

