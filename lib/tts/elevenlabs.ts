/**
 * ElevenLabs TTS Provider (Placeholder)
 * 
 * This module is ready for ElevenLabs integration.
 * To enable:
 * 1. Get an API key from https://elevenlabs.io
 * 2. Add ELEVENLABS_API_KEY to your environment variables
 * 3. Implement the synthesizeWithElevenLabs function below
 * 
 * Documentation: https://docs.elevenlabs.io/api-reference/text-to-speech
 */

// ElevenLabs voice IDs (some popular ones)
// You can find more at: https://api.elevenlabs.io/v1/voices
const VOICE_IDS = {
  adam: '21m00Tcm4TlvDq8ikWAM',      // Deep, professional male
  rachel: '21m00Tcm4TlvDq8ikWAM',    // Calm female
  josh: 'TxGEqnHWrfWFTfGW9XjX',       // Conversational male
  bella: 'EXAVITQu4vr4xnSDxMaL',      // Soft female
}

/**
 * Synthesize speech using ElevenLabs API
 * @param text - The text to convert to speech
 * @returns Base64 data URL for the audio
 */
export async function synthesizeWithElevenLabs(text: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error(
      'ElevenLabs API key not configured. ' +
      'Please set ELEVENLABS_API_KEY in your environment variables, ' +
      'or switch to OpenAI TTS by setting TTS_PROVIDER=openai'
    )
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || VOICE_IDS.adam

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${error}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  
  return `data:audio/mpeg;base64,${base64}`
}

