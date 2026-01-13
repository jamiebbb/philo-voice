import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VECTOR_STORE_ID = 'vs_67f55053de9c8191a46b2a3a553a011d'

export async function GET() {
  try {
    // Get the vector store details
    const vectorStore = await openai.beta.vectorStores.retrieve(VECTOR_STORE_ID)
    
    // List all files in the vector store
    const files = await openai.beta.vectorStores.files.list(VECTOR_STORE_ID)
    
    // Get file details for each file
    const fileDetails = await Promise.all(
      files.data.map(async (vsFile) => {
        try {
          const file = await openai.files.retrieve(vsFile.id)
          return {
            id: file.id,
            filename: file.filename,
            size: file.bytes,
            createdAt: new Date(file.created_at * 1000),
            status: vsFile.status,
          }
        } catch (e) {
          return null
        }
      })
    )
    
    const validFiles = fileDetails.filter(f => f !== null)
    
    return NextResponse.json({
      vectorStoreId: VECTOR_STORE_ID,
      vectorStoreName: vectorStore.name,
      fileCount: vectorStore.file_counts.total,
      files: validFiles,
    })
  } catch (error) {
    console.error('Library API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch library' },
      { status: 500 }
    )
  }
}
