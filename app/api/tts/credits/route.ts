import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 400 }
      )
    }

    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch ElevenLabs user info')
    }

    const data = await response.json()

    return NextResponse.json({
      characterCount: data.subscription?.character_count || 0,
      characterLimit: data.subscription?.character_limit || 10000,
      canExtendCharacterLimit: data.subscription?.can_extend_character_limit || false,
      nextCharacterCountResetUnix: data.subscription?.next_character_count_reset_unix || null,
    })
  } catch (error) {
    console.error('ElevenLabs Credits API Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}
