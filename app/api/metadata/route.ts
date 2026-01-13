import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const METADATA_PATH = path.join(process.cwd(), 'lib', 'bookMetadata.json')

export async function GET() {
  try {
    const data = await fs.readFile(METADATA_PATH, 'utf-8')
    const metadata = JSON.parse(data)
    
    return NextResponse.json(metadata)
  } catch (error) {
    console.error('Error reading metadata:', error)
    
    // If file doesn't exist, return empty object
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({})
    }
    
    return NextResponse.json(
      { error: 'Failed to read metadata' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const newMetadata = await request.json()
    
    // Write the updated metadata
    await fs.writeFile(
      METADATA_PATH,
      JSON.stringify(newMetadata, null, 2),
      'utf-8'
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error writing metadata:', error)
    
    return NextResponse.json(
      { error: 'Failed to update metadata' },
      { status: 500 }
    )
  }
}
