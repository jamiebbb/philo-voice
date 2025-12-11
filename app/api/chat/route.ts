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

// Store assistant ID once created (in production, you'd store this in env vars)
let assistantId: string | null = null

async function getOrCreateAssistant(): Promise<string> {
  if (assistantId) return assistantId

  // Check if we have a stored assistant ID in env
  if (process.env.OPENAI_ASSISTANT_ID) {
    assistantId = process.env.OPENAI_ASSISTANT_ID
    return assistantId
  }

  // Create a new assistant with file search capabilities
  const assistant = await openai.beta.assistants.create({
    name: 'Philo',
    instructions: SYSTEM_PROMPT,
    model: 'gpt-4o',
    tools: [{ type: 'file_search' }],
    tool_resources: {
      file_search: {
        vector_store_ids: [VECTOR_STORE_ID],
      },
    },
  })

  assistantId = assistant.id
  console.log('Created new assistant:', assistantId)
  return assistantId
}

async function waitForRunCompletion(
  threadId: string,
  runId: string,
  maxAttempts = 60
): Promise<OpenAI.Beta.Threads.Runs.Run> {
  let attempts = 0
  
  while (attempts < maxAttempts) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId)
    
    if (run.status === 'completed') {
      return run
    }
    
    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`)
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000))
    attempts++
  }
  
  throw new Error('Run timed out')
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get or create the assistant
    const asstId = await getOrCreateAssistant()

    // Create a new thread
    const thread = await openai.beta.threads.create()

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    })

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: asstId,
    })

    // Wait for the run to complete
    await waitForRunCompletion(thread.id, run.id)

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id)
    
    // Find the assistant's response (most recent message with role 'assistant')
    const assistantMessage = messages.data.find(m => m.role === 'assistant')
    
    let responseText = 'I could not formulate a response. Please try again.'
    
    if (assistantMessage && assistantMessage.content.length > 0) {
      const textContent = assistantMessage.content.find(c => c.type === 'text')
      if (textContent && textContent.type === 'text') {
        responseText = textContent.text.value
        
        // Clean up citation markers like 【4:0†source】
        responseText = responseText.replace(/【\d+:\d+†[^】]*】/g, '')
      }
    }

    // Generate TTS audio
    let audioUrl: string | null = null
    try {
      const ttsProvider: TTSProvider = (process.env.TTS_PROVIDER as TTSProvider) || 'openai'
      audioUrl = await synthesizeSpeech(responseText, ttsProvider)
    } catch (ttsError) {
      console.error('TTS Error:', ttsError)
      // Continue without audio if TTS fails
    }

    // Clean up the thread (optional, but good practice)
    try {
      await openai.beta.threads.del(thread.id)
    } catch (e) {
      // Ignore deletion errors
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
