import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const VECTOR_STORE_ID = 'vs_67f55053de9c8191a46b2a3a553a011d'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (OpenAI limit is 512 MB)
    const MAX_SIZE = 512 * 1024 * 1024 // 512 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 512 MB.' },
        { status: 400 }
      )
    }

    // Check if it's a PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Convert File to Buffer for OpenAI
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to OpenAI Files API
    const uploadedFile = await openai.files.create({
      file: new File([buffer], file.name, { type: 'application/pdf' }),
      purpose: 'assistants',
    })

    // Note: Adding to vector store requires the beta.vectorStores API
    // which may not be available in current SDK version
    // The file will be accessible to assistants but may need manual addition to vector store
    
    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      filename: uploadedFile.filename,
      message: 'File uploaded successfully. You may need to manually add it to the vector store in OpenAI dashboard.',
    })
  } catch (error) {
    console.error('Upload Error:', error)
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Route segment config for large file uploads
export const maxDuration = 60 // Max execution time in seconds
