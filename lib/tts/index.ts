/**
 * Modular Text-to-Speech Service
 * 
 * This module provides a unified interface for different TTS providers.
 * Currently supports:
 * - OpenAI TTS
 * - ElevenLabs (ready for implementation)
 * 
 * To add a new provider:
 * 1. Create a new file in lib/tts/ (e.g., newprovider.ts)
 * 2. Export a function matching the TTSSynthesizer type
 * 3. Add the provider to the TTSProvider type and providers object below
 */

export type TTSProvider = 'openai' | 'elevenlabs'

export type TTSSynthesizer = (text: string) => Promise<string>

import { synthesizeWithOpenAI } from './openai'
import { synthesizeWithElevenLabs } from './elevenlabs'

const providers: Record<TTSProvider, TTSSynthesizer> = {
  openai: synthesizeWithOpenAI,
  elevenlabs: synthesizeWithElevenLabs,
}

/**
 * Synthesize speech using the specified provider
 * @param text - The text to convert to speech
 * @param provider - The TTS provider to use (defaults to 'openai')
 * @returns Base64 data URL for the audio
 */
export async function synthesizeSpeech(
  text: string,
  provider: TTSProvider = 'openai'
): Promise<string> {
  const synthesizer = providers[provider]
  
  if (!synthesizer) {
    throw new Error(`Unknown TTS provider: ${provider}`)
  }

  return synthesizer(text)
}

/**
 * Get available TTS providers
 */
export function getAvailableProviders(): TTSProvider[] {
  return Object.keys(providers) as TTSProvider[]
}

