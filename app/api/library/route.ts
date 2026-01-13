import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VECTOR_STORE_ID = 'vs_67f55053de9c8191a46b2a3a553a011d'

export async function GET() {
  try {
    // List all files from the assistant or directly from files API
    const allFiles = await openai.files.list({
      purpose: 'assistants',
    })
    
    // Get file details - filter for those likely in the vector store
    const fileDetails = allFiles.data
      .filter(file => file.filename.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        id: file.id,
        filename: file.filename,
        size: file.bytes,
        createdAt: new Date(file.created_at * 1000),
        status: 'completed', // Assume completed if listed
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Sort by newest first
    
    return NextResponse.json({
      vectorStoreId: VECTOR_STORE_ID,
      vectorStoreName: 'Philo Library',
      fileCount: fileDetails.length,
      files: fileDetails,
    })
  } catch (error) {
    console.error('Library API Error:', error)
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch library' },
      { status: 500 }
    )
  }
}
