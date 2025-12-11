/**
 * OpenAI TTS Provider
 * 
 * Uses OpenAI's text-to-speech API to generate audio from text.
 * Documentation: https://platform.openai.com/docs/guides/text-to-speech
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Available voices: alloy, echo, fable, onyx, nova, shimmer
// Using 'nova' for a warm, friendly female voice
const DEFAULT_VOICE: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'

// Using tts-1 for faster response, tts-1-hd for higher quality
const DEFAULT_MODEL: 'tts-1' | 'tts-1-hd' = 'tts-1'

/**
 * Synthesize speech using OpenAI's TTS API
 * @param text - The text to convert to speech
 * @returns Base64 data URL for the audio (mp3 format)
 */
export async function synthesizeWithOpenAI(text: string): Promise<string> {
  // Truncate very long texts to avoid API limits
  const maxLength = 4096
  const truncatedText = text.length > maxLength 
    ? text.substring(0, maxLength - 3) + '...'
    : text

  const mp3Response = await openai.audio.speech.create({
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    input: truncatedText,
    response_format: 'mp3',
  })

  // Convert the response to a base64 data URL
  const arrayBuffer = await mp3Response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  
  return `data:audio/mp3;base64,${base64}`
}
