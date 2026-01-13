'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface BookFile {
  id: string
  filename: string
  size: number
  createdAt: string
  status: string
}

interface LibraryData {
  vectorStoreId: string
  vectorStoreName: string
  fileCount: number
  files: BookFile[]
}

interface CreditsData {
  characterCount: number
  characterLimit: number
  nextCharacterCountResetUnix: number | null
}

interface BookMetadata {
  [filename: string]: {
    title: string
    author: string
    topic: string
    location: string
    status: 'available' | 'checked-out'
    checkedOutBy: string | null
    notes: string
  }
}

// Phoenician ship icon
const PhoenicianShip = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 120 60" className={className} fill="currentColor">
    <path d="M10 45 Q30 55 60 55 Q90 55 110 45 L105 50 Q60 60 15 50 Z" />
    <path d="M20 45 L25 20 L30 20 L30 45" />
    <path d="M25 20 Q50 15 75 20 L75 35 Q50 30 25 35 Z" opacity="0.8" />
    <path d="M60 45 L60 10 L65 10 L65 45" />
    <path d="M62 10 L95 25 L62 30 Z" opacity="0.9" />
    <circle cx="85" cy="48" r="3" />
    <circle cx="35" cy="48" r="3" />
  </svg>
)

// Format file size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default function LibraryPage() {
  const [library, setLibrary] = useState<LibraryData | null>(null)
  const [credits, setCredits] = useState<CreditsData | null>(null)
  const [metadata, setMetadata] = useState<BookMetadata>({})
  const [editingBook, setEditingBook] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    location: '',
    status: 'available' as 'available' | 'checked-out',
    checkedOutBy: '',
    notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch library
        const libraryResponse = await fetch('/api/library')
        if (!libraryResponse.ok) throw new Error('Failed to fetch library')
        const libraryData = await libraryResponse.json()
        setLibrary(libraryData)

        // Fetch credits
        try {
          const creditsResponse = await fetch('/api/tts/credits')
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json()
            setCredits(creditsData)
          }
        } catch (e) {
          console.warn('Could not fetch credits:', e)
        }

        // Fetch metadata
        try {
          const metadataResponse = await fetch('/api/metadata')
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json()
            setMetadata(metadataData)
          }
        } catch (e) {
          console.warn('Could not fetch metadata:', e)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const updateBookMetadata = async (filename: string, updates: Partial<BookMetadata[string]>) => {
    const currentMeta = metadata[filename] || {
      title: filename.replace('.pdf', ''),
      author: '',
      topic: '',
      location: 'Not assigned',
      status: 'available' as const,
      checkedOutBy: null,
      notes: '',
    }

    const updatedMetadata = {
      ...metadata,
      [filename]: { ...currentMeta, ...updates }
    }

    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMetadata),
      })

      if (response.ok) {
        setMetadata(updatedMetadata)
        setEditingBook(null)
      }
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (response.ok) {
        alert(`Success! ${data.message}`)
        setUploadFile(null)
        setShowUploadModal(false)
        // Refresh the library
        window.location.reload()
      } else {
        alert(`Upload failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const openEditModal = (filename: string) => {
    const meta = metadata[filename] || {
      location: 'Not assigned',
      status: 'available' as const,
      checkedOutBy: null,
      notes: '',
    }
    setEditForm({
      location: meta.location,
      status: meta.status,
      checkedOutBy: meta.checkedOutBy || '',
      notes: meta.notes,
    })
    setEditingBook(filename)
  }

  const saveEdit = () => {
    if (!editingBook) return
    updateBookMetadata(editingBook, {
      ...editForm,
      checkedOutBy: editForm.checkedOutBy || null,
    })
  }

  // Filter books based on search
  const filteredBooks = library?.files.filter(file => {
    const query = searchQuery.toLowerCase()
    const meta = metadata[file.filename]
    return (
      file.filename.toLowerCase().includes(query) ||
      meta?.title?.toLowerCase().includes(query) ||
      meta?.author?.toLowerCase().includes(query) ||
      meta?.topic?.toLowerCase().includes(query) ||
      meta?.location?.toLowerCase().includes(query)
    )
  }) || []

  return (
    <main className="min-h-screen bg-gradient-to-br from-phoenician-deep via-phoenician-navy to-phoenician-deep">
      {/* Header */}
      <motion.header 
        className="relative z-10 pt-8 pb-6 px-4 border-b border-phoenician-bronze/30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/"
              className="p-2 rounded-lg hover:bg-phoenician-navy/50 transition-colors flex items-center gap-2 text-phoenician-sand/80"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Chat
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 rounded-lg bg-phoenician-terracotta/20 border border-phoenician-terracotta/50
                         hover:bg-phoenician-terracotta/30 transition-colors flex items-center gap-2 text-phoenician-cream"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Book
              </button>
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <PhoenicianShip className="w-16 h-8 text-phoenician-gold ship-icon" />
              </motion.div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-wider text-phoenician-cream mb-2">
              The <span className="text-phoenician-gold">Library</span>
            </h1>
            <p className="font-body text-xl text-phoenician-sand/80 italic">
              Scrolls of knowledge in the collection
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {['◆', '◇', '◆', '◇', '◆'].map((symbol, i) => (
                <span key={i} className="text-phoenician-bronze text-sm">{symbol}</span>
              ))}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="flex justify-center gap-2 mb-4">
              <span className="loading-dot w-3 h-3 bg-phoenician-gold rounded-full"></span>
              <span className="loading-dot w-3 h-3 bg-phoenician-gold rounded-full"></span>
              <span className="loading-dot w-3 h-3 bg-phoenician-gold rounded-full"></span>
            </div>
            <p className="font-body text-lg text-phoenician-sand/80">
              Loading the library...
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="scroll-paper rounded-2xl p-8 max-w-md mx-auto text-center"
          >
            <p className="font-body text-lg text-phoenician-wine">
              Error loading library: {error}
            </p>
          </motion.div>
        )}

        {library && (
          <>
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
            >
              <div className="bg-phoenician-navy/40 border border-phoenician-bronze/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-display font-bold text-phoenician-gold mb-2">
                  {library.fileCount}
                </div>
                <div className="font-body text-phoenician-sand/70">
                  Books in Collection
                </div>
              </div>

              <div className="bg-phoenician-navy/40 border border-phoenician-bronze/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-display font-bold text-phoenician-gold mb-2">
                  {formatBytes(library.files.reduce((acc, f) => acc + f.size, 0))}
                </div>
                <div className="font-body text-phoenician-sand/70">
                  Total Size
                </div>
              </div>

              <div className="bg-phoenician-navy/40 border border-phoenician-bronze/30 rounded-xl p-6 text-center">
                <div className="text-3xl font-display font-bold text-phoenician-gold mb-2">
                  {library.files.filter(f => f.status === 'completed').length}
                </div>
                <div className="font-body text-phoenician-sand/70">
                  Ready to Search
                </div>
              </div>

              {credits && (
                <div className="bg-phoenician-navy/40 border border-phoenician-bronze/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-display font-bold text-phoenician-gold mb-2">
                    {credits.characterLimit - credits.characterCount}
                  </div>
                  <div className="font-body text-phoenician-sand/70">
                    Voice Credits Left
                  </div>
                  <div className="text-xs text-phoenician-sand/50 mt-1">
                    {Math.round((credits.characterLimit - credits.characterCount) / 500)} responses
                  </div>
                </div>
              )}
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books by title, author, topic, or location..."
                  className="w-full px-5 py-4 pl-12 rounded-2xl bg-phoenician-navy/60 border-2 border-phoenician-bronze/30
                           text-phoenician-cream placeholder-phoenician-sand/50 font-body text-lg
                           focus:outline-none focus:border-phoenician-gold focus:ring-2 focus:ring-phoenician-gold/30
                           transition-all duration-300"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-phoenician-sand/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </motion.div>

            {/* Books Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="font-display text-2xl font-semibold text-phoenician-cream mb-6 flex items-center gap-3">
                <span className="text-phoenician-gold">📚</span>
                Books & Documents
                {searchQuery && (
                  <span className="text-sm font-body text-phoenician-sand/70">
                    ({filteredBooks.length} result{filteredBooks.length !== 1 ? 's' : ''})
                  </span>
                )}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBooks.map((file, index) => {
                  const meta = metadata[file.filename]
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-phoenician-navy/60 border border-phoenician-bronze/30 rounded-xl p-6 
                               hover:border-phoenician-gold/50 transition-all duration-300 hover:shadow-lg
                               hover:shadow-phoenician-gold/10"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-16 bg-phoenician-terracotta/20 rounded-lg 
                                      border-2 border-phoenician-terracotta/50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-phoenician-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-body text-lg font-semibold text-phoenician-cream break-words">
                              {meta?.title || file.filename.replace('.pdf', '')}
                            </h3>
                            <button
                              onClick={() => openEditModal(file.filename)}
                              className="flex-shrink-0 p-2 rounded-lg hover:bg-phoenician-sea/30 transition-colors"
                              title="Edit book info"
                            >
                              <svg className="w-4 h-4 text-phoenician-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {meta?.author && (
                              <div className="text-sm text-phoenician-sand/70">
                                ✍️ {meta.author}
                              </div>
                            )}
                            
                            {meta?.topic && (
                              <div className="text-sm text-phoenician-sand/70">
                                🏷️ {meta.topic}
                              </div>
                            )}

                            <div className="text-sm text-phoenician-sand/70">
                              📍 {meta?.location || 'Location not set'}
                            </div>

                            {meta?.status === 'checked-out' && meta.checkedOutBy && (
                              <div className="text-sm text-yellow-400/90">
                                📤 Checked out by {meta.checkedOutBy}
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-phoenician-sand/70 pt-2 border-t border-phoenician-bronze/20">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="font-mono">{formatBytes(file.size)}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {filteredBooks.length === 0 && (
                <div className="scroll-paper rounded-2xl p-8 text-center">
                  <p className="font-body text-lg text-phoenician-deep/70">
                    {searchQuery ? 'No books match your search' : 'No books found in the library'}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingBook(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-phoenician-navy border-2 border-phoenician-bronze rounded-2xl p-8 max-w-md w-full"
            >
              <h2 className="font-display text-2xl font-bold text-phoenician-gold mb-6">
                Edit Book Info
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block font-body text-phoenician-sand/80 mb-2">
                    Physical Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    placeholder="e.g., Shelf A3, Row 2"
                    className="w-full px-4 py-3 rounded-lg bg-phoenician-deep/50 border border-phoenician-bronze/30
                             text-phoenician-cream placeholder-phoenician-sand/50 font-body
                             focus:outline-none focus:border-phoenician-gold"
                  />
                </div>

                <div>
                  <label className="block font-body text-phoenician-sand/80 mb-2">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value as 'available' | 'checked-out'})}
                    className="w-full px-4 py-3 rounded-lg bg-phoenician-deep/50 border border-phoenician-bronze/30
                             text-phoenician-cream font-body
                             focus:outline-none focus:border-phoenician-gold"
                  >
                    <option value="available">Available</option>
                    <option value="checked-out">Checked Out</option>
                  </select>
                </div>

                {editForm.status === 'checked-out' && (
                  <div>
                    <label className="block font-body text-phoenician-sand/80 mb-2">
                      Checked Out By
                    </label>
                    <input
                      type="text"
                      value={editForm.checkedOutBy}
                      onChange={(e) => setEditForm({...editForm, checkedOutBy: e.target.value})}
                      placeholder="Person's name"
                      className="w-full px-4 py-3 rounded-lg bg-phoenician-deep/50 border border-phoenician-bronze/30
                               text-phoenician-cream placeholder-phoenician-sand/50 font-body
                               focus:outline-none focus:border-phoenician-gold"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-body text-phoenician-sand/80 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Any additional notes..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-phoenician-deep/50 border border-phoenician-bronze/30
                             text-phoenician-cream placeholder-phoenician-sand/50 font-body
                             focus:outline-none focus:border-phoenician-gold resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveEdit}
                  className="flex-1 py-3 rounded-lg bg-phoenician-terracotta hover:bg-phoenician-terracotta/80
                           text-phoenician-cream font-body font-semibold transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingBook(null)}
                  className="flex-1 py-3 rounded-lg bg-phoenician-deep/50 hover:bg-phoenician-deep/70
                           text-phoenician-sand font-body transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-phoenician-navy border-2 border-phoenician-bronze rounded-2xl p-8 max-w-md w-full"
            >
              <h2 className="font-display text-2xl font-bold text-phoenician-gold mb-6">
                Upload Book
              </h2>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block font-body text-phoenician-sand/80 mb-2">
                    Select PDF File (max 512 MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 rounded-lg bg-phoenician-deep/50 border border-phoenician-bronze/30
                             text-phoenician-cream font-body file:mr-4 file:py-2 file:px-4
                             file:rounded-lg file:border-0 file:bg-phoenician-terracotta/20
                             file:text-phoenician-cream hover:file:bg-phoenician-terracotta/30
                             file:cursor-pointer cursor-pointer"
                  />
                </div>

                {uploadFile && (
                  <div className="text-sm text-phoenician-sand/70 font-body">
                    Selected: {uploadFile.name} ({formatBytes(uploadFile.size)})
                  </div>
                )}

                <div className="bg-phoenician-deep/30 rounded-lg p-4 text-sm text-phoenician-sand/70 font-body">
                  <p className="mb-2">Note:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>File will be uploaded to OpenAI</li>
                    <li>May need manual addition to vector store</li>
                    <li>Refresh page after upload to see new book</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="flex-1 py-3 rounded-lg bg-phoenician-terracotta hover:bg-phoenician-terracotta/80
                             text-phoenician-cream font-body font-semibold transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 py-3 rounded-lg bg-phoenician-deep/50 hover:bg-phoenician-deep/70
                             text-phoenician-sand font-body transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
