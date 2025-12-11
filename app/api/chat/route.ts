import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { synthesizeSpeech, TTSProvider } from '@/lib/tts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VECTOR_STORE_ID = 'vs_67f55053de9c8191a46b2a3a553a011d'

const SYSTEM_PROMPT = `You are Philo, a helpful research assistant. You have access to a knowledge base containing books on various topics including investment, decision-making, psychology, and more.

When answering:
- Draw on information from your knowledge base when relevant, and mention the source if helpful
- Be clear, conversational, and helpful
- Keep answers focused and practical
- If a question is outside your knowledge base, use your general knowledge and be upfront about it

Just be yourself - friendly and knowledgeable.`

// Store assistant ID once created
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
    model: 'gpt-4o-mini',
    tools: [{ 
      type: 'file_search',
      file_search: {
        max_num_results: 5, // Limit to 5 chunks for faster retrieval
      }
    }],
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

// Extract file references from annotations
async function getFileReferences(annotations: any[]): Promise<string[]> {
  const fileIds = new Set<string>()
  
  for (const annotation of annotations) {
    if (annotation.type === 'file_citation' && annotation.file_citation?.file_id) {
      fileIds.add(annotation.file_citation.file_id)
    }
  }
  
  const fileNames: string[] = []
  const fileIdArray = Array.from(fileIds)
  for (let i = 0; i < fileIdArray.length; i++) {
    try {
      const file = await openai.files.retrieve(fileIdArray[i])
      fileNames.push(file.filename)
    } catch (e) {
      // File might not be accessible, skip
    }
  }
  
  return fileNames
}

export async function POST(request: NextRequest) {
  try {
    const { message, threadId: existingThreadId } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get or create the assistant
    const asstId = await getOrCreateAssistant()

    // Use existing thread or create a new one
    let threadId = existingThreadId
    if (!threadId) {
      const thread = await openai.beta.threads.create()
      threadId = thread.id
    }

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    })

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: asstId,
    })

    // Wait for the run to complete
    await waitForRunCompletion(threadId, run.id)

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId)
    
    // Find the assistant's response (most recent message with role 'assistant')
    const assistantMessage = messages.data.find(m => m.role === 'assistant')
    
    let responseText = 'I could not formulate a response. Please try again.'
    let sources: string[] = []
    
    if (assistantMessage && assistantMessage.content.length > 0) {
      const textContent = assistantMessage.content.find(c => c.type === 'text')
      if (textContent && textContent.type === 'text') {
        responseText = textContent.text.value
        
        // Get file references from annotations
        if (textContent.text.annotations && textContent.text.annotations.length > 0) {
          sources = await getFileReferences(textContent.text.annotations)
        }
        
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

    return NextResponse.json({
      response: responseText,
      audioUrl,
      threadId,
      sources,
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
