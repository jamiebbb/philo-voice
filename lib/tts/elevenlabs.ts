/**
 * ElevenLabs TTS Provider
 * 
 * Uses ElevenLabs API for high-quality text-to-speech
 * Documentation: https://docs.elevenlabs.io/api-reference/text-to-speech
 */

// Default voice: Jamie
const DEFAULT_VOICE_ID = 'llNlEi50DSCIEuoOIaH7'

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
      'Please set ELEVENLABS_API_KEY in your environment variables.'
    )
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID

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
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
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

