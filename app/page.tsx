'use client'

import { useState, useEffect, useRef } from 'react'
import { getBooks, insertBook, updateBook, deleteBook, updateHighlights } from '../lib/supabase'

export default function Home() {
  const [books, setBooks] = useState<any[]>([])
  const [view, setView] = useState('library')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [newBook, setNewBook] = useState({ title: '', author: '', genre: '', cover: '', status: 'want', rating: 0, notes: '' })
  const [activeBook, setActiveBook] = useState<any>(null)
  const [editData, setEditData] = useState<any>(null)
  const [modalTab, setModalTab] = useState('details')
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [generatedReview, setGeneratedReview] = useState('')
  const [newHighlight, setNewHighlight] = useState('')
  const chatRef = useRef<any>(null)
  const [recs, setRecs] = useState<any[]>([])
const [recLoading, setRecLoading] = useState(false)
const [recsFetched, setRecsFetched] = useState(false)

  useEffect(() => { fetchBooks() }, [])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [chatMessages])

  async function fetchBooks() {
    const data = await getBooks()
    if (data) setBooks(data)
    setLoading(false)
  }

  async function searchGoogleBooks() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`)
      const data = await res.json()
      setSearchResults(data.items || [])
    } catch { setSearchResults([]) }
    setSearching(false)
  }

  function selectBook(item: any) {
    const info = item.volumeInfo
    setNewBook({ title: info.title || '', author: (info.authors || [''])[0], genre: (info.categories || [''])[0], cover: info.imageLinks?.thumbnail || '', status: 'want', rating: 0, notes: '' })
    setSelectedBook(item)
    setSearchResults([])
  }

  async function addBook() {
    if (!newBook.title) return
    const data = await insertBook(newBook)
    if (data && data[0]) {
      setBooks([data[0], ...books])
      setNewBook({ title: '', author: '', genre: '', cover: '', status: 'want', rating: 0, notes: '' })
      setSelectedBook(null)
      setSearchQuery('')
      setShowAddForm(false)
    }
  }

  async function handleUpdateBook() {
    if (!activeBook) return
    const finalData = { ...editData, review: generatedReview || editData.review }
    const data = await updateBook(activeBook.id, finalData)
    if (data && data[0]) {
      setBooks(books.map(b => b.id === activeBook.id ? data[0] : b))
      setActiveBook(null)
      setEditData(null)
      setGeneratedReview('')
    }
  }

  async function handleDeleteBook() {
    if (!activeBook) return
    await deleteBook(activeBook.id)
    setBooks(books.filter(b => b.id !== activeBook.id))
    setActiveBook(null)
    setEditData(null)
    setGeneratedReview('')
  }

  async function addHighlight() {
    if (!newHighlight.trim() || !activeBook) return
    const updated = [...(activeBook.highlights || []), newHighlight.trim()]
    const data = await updateHighlights(activeBook.id, updated)
    if (data && data[0]) {
      setBooks(books.map(b => b.id === activeBook.id ? data[0] : b))
      setActiveBook(data[0])
      setNewHighlight('')
    }
  }

  async function deleteHighlight(index: number) {
    if (!activeBook) return
    const updated = (activeBook.highlights || []).filter((_: any, i: number) => i !== index)
    const data = await updateHighlights(activeBook.id, updated)
    if (data && data[0]) {
      setBooks(books.map(b => b.id === activeBook.id ? data[0] : b))
      setActiveBook(data[0])
    }
  }

  function openBook(book: any) {
    setActiveBook(book)
    setEditData({ status: book.status, rating: book.rating, notes: book.notes, review: book.review })
    setModalTab('details')
    setGeneratedReview('')
    setNewHighlight('')
    setChatMessages([{ role: 'ai', text: `Let's talk about *${book.title}*. What did you think? What stayed with you after you finished?` }])
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    const newMsgs = [...chatMessages, { role: 'user', text: userMsg }]
    setChatMessages(newMsgs)
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a warm literary companion helping a reader reflect on "${activeBook?.title}" by ${activeBook?.author}. Ask thoughtful follow-up questions about themes, characters, and personal reactions. Keep responses under 3 sentences. After a few exchanges, offer to write a personalized review.`,
          messages: newMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
        })
      })
      const data = await res.json()
      setChatMessages(m => [...m, { role: 'ai', text: data.content || 'Tell me more!' }])
    } catch {
      setChatMessages(m => [...m, { role: 'ai', text: 'Sorry, something went wrong. Try again!' }])
    }
    setChatLoading(false)
  }

  async function generateReview() {
    setChatLoading(true)
    const context = chatMessages.map(m => `${m.role === 'ai' ? 'Claude' : 'Reader'}: ${m.text}`).join('\n')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Based on this conversation about "${activeBook?.title}" by ${activeBook?.author}, write a personal first-person book review (150-200 words) that captures the reader's genuine thoughts. Make it sound like them, not a critic.\n\n${context}`
          }]
        })
      })
      const data = await res.json()
      const review = data.content || ''
      setGeneratedReview(review)
      setEditData((e: any) => ({ ...e, review }))
      setChatMessages(m => [...m, { role: 'ai', text: "I've written your review! Check the Details tab." }])
      setTimeout(() => setModalTab('details'), 300)
    } catch {}
    setChatLoading(false)
  }

  const allHighlights = books.flatMap(b => (b.highlights || []).map((h: string) => ({ text: h, book: b.title, author: b.author })))
async function getRecommendations() {
  setRecLoading(true)
  const finished = books.filter(b => b.status === 'finished')
  const summary = finished.length > 0
    ? finished.map(b => `${b.title} by ${b.author} (${b.genre || 'unknown genre'}, rated ${b.rating}/5)`).join('; ')
    : 'no books finished yet, suggest popular literary fiction'
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Based on these books a reader has finished: ${summary} — recommend 4 books they would love. Return ONLY a JSON array with no markdown, like: [{"title":"...","author":"...","reason":"...","genre":"..."}]. Keep each reason to 1 sentence that directly references their taste.`
        }]
      })
    })
    const data = await res.json()
    const text = data.content || '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    setRecs(parsed)
    setRecsFetched(true)
  } catch { setRecs([]) }
  setRecLoading(false)
}
  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 60px' }}>
      <header style={{ borderBottom: '2px solid #1a1410', padding: '28px 0 18px', marginBottom: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: '700' }}>Hopscotch</h1>
          <p style={{ fontSize: '0.78rem', color: '#7a6a57', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '4px' }}>Your Personal Reading Companion</p>
        </div>
        <nav style={{ display: 'flex', border: '1.5px solid #1a1410' }}>
          {['library', 'highlights', 'discover'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? '#1a1410' : 'transparent', color: view === v ? '#faf7f2' : '#1a1410',
              border: 'none', borderRight: v !== 'discover' ? '1.5px solid #1a1410' : 'none',
              padding: '7px 16px', fontFamily: 'Georgia, serif', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize'
            }}>{v}</button>
          ))}
        </nav>
      </header>

      {view === 'library' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontStyle: 'italic' }}>My Library</h2>
            <button onClick={() => setShowAddForm(true)} style={{ background: '#1a1410', color: '#faf7f2', border: 'none', padding: '8px 18px', fontFamily: 'Georgia, serif', fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Book</button>
          </div>

          {showAddForm && (
            <div style={{ background: '#f5f0e8', border: '1.5px solid #d4c5a9', padding: '24px', marginBottom: '24px', borderRadius: '2px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', marginBottom: '16px' }}>Add a Book</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a6a57', display: 'block', marginBottom: '6px' }}>Search by title or author</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input placeholder="e.g. Throne of Glass..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchGoogleBooks()}
                    style={{ flex: 1, padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#faf7f2' }} />
                  <button onClick={searchGoogleBooks} style={{ padding: '8px 16px', background: '#1a1410', color: '#faf7f2', border: 'none', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>{searching ? '...' : 'Search'}</button>
                </div>
                {searchResults.length > 0 && (
                  <div style={{ border: '1.5px solid #d4c5a9', background: '#faf7f2', maxHeight: '220px', overflowY: 'auto' }}>
                    {searchResults.map((item: any) => (
                      <div key={item.id} onClick={() => selectBook(item)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #d4c5a9', display: 'flex', gap: '12px', alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f0e8')} onMouseLeave={e => (e.currentTarget.style.background = '#faf7f2')}>
                        {item.volumeInfo.imageLinks?.thumbnail && <img src={item.volumeInfo.imageLinks.thumbnail} style={{ width: '36px', height: '52px', objectFit: 'cover' }} alt="" />}
                        <div>
                          <div style={{ fontFamily: 'Georgia, serif', fontWeight: '700', fontSize: '0.88rem' }}>{item.volumeInfo.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#7a6a57', fontStyle: 'italic' }}>{(item.volumeInfo.authors || []).join(', ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedBook && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px', padding: '12px', background: '#faf7f2', border: '1.5px solid #d4c5a9' }}>
                  {newBook.cover && <img src={newBook.cover} style={{ width: '60px', height: '90px', objectFit: 'cover' }} alt="" />}
                  <div>
                    <div style={{ fontFamily: 'Georgia, serif', fontWeight: '700' }}>{newBook.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#7a6a57', fontStyle: 'italic' }}>{newBook.author}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input placeholder="Title *" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                  style={{ padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#faf7f2' }} />
                <input placeholder="Author" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                  style={{ padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#faf7f2' }} />
                <select value={newBook.status} onChange={e => setNewBook({ ...newBook, status: e.target.value })}
                  style={{ padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#faf7f2' }}>
                  <option value="want">Want to Read</option>
                  <option value="reading">Currently Reading</option>
                  <option value="finished">Finished</option>
                </select>
                <select value={newBook.rating} onChange={e => setNewBook({ ...newBook, rating: parseInt(e.target.value) })}
                  style={{ padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#faf7f2' }}>
                  <option value={0}>No rating</option>
                  <option value={1}>★ 1</option><option value={2}>★★ 2</option><option value={3}>★★★ 3</option><option value={4}>★★★★ 4</option><option value={5}>★★★★★ 5</option>
                </select>
              </div>
              <textarea placeholder="Notes..." value={newBook.notes} onChange={e => setNewBook({ ...newBook, notes: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#faf7f2', minHeight: '80px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowAddForm(false); setSearchResults([]); setSelectedBook(null) }}
                  style={{ padding: '8px 18px', fontFamily: 'Georgia, serif', background: 'transparent', border: '1.5px solid #1a1410', cursor: 'pointer' }}>Cancel</button>
                <button onClick={addBook} style={{ padding: '8px 18px', fontFamily: 'Georgia, serif', background: '#1a1410', color: '#faf7f2', border: 'none', cursor: 'pointer' }}>Save Book</button>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ color: '#7a6a57', fontStyle: 'italic' }}>Loading your library...</p>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6a57' }}>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>📚</div>
              <p style={{ fontStyle: 'italic' }}>Your library is empty. Add your first book!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {books.map(book => (
                <div key={book.id} onClick={() => openBook(book)}
                  style={{ background: '#faf7f2', border: '1.5px solid #d4c5a9', borderRadius: '2px', overflow: 'hidden', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,20,16,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  {book.cover
                    ? <img src={book.cover} alt={book.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', aspectRatio: '2/3', background: '#ede6d6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: '#7a6a57', textAlign: 'center' }}>{book.title}</div>
                  }
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontWeight: '700', fontSize: '0.9rem', marginBottom: '3px' }}>{book.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#7a6a57', fontStyle: 'italic', marginBottom: '8px' }}>{book.author}</div>
                    <span style={{
                      fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 7px',
                      background: book.status === 'finished' ? '#d5e8d4' : book.status === 'reading' ? '#fdebd0' : '#e8eaf6',
                      color: book.status === 'finished' ? '#2e7d32' : book.status === 'reading' ? '#b7620a' : '#3949ab'
                    }}>{book.status === 'want' ? 'Want to Read' : book.status === 'reading' ? 'Reading' : 'Finished'}</span>
                    {book.rating > 0 && <div style={{ marginTop: '6px', color: '#c9a84c' }}>{'★'.repeat(book.rating)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'highlights' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontStyle: 'italic' }}>Your Commonplace Book</h2>
            <p style={{ color: '#7a6a57', fontSize: '0.85rem', marginTop: '4px' }}>{allHighlights.length} passages saved</p>
          </div>
          {allHighlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6a57' }}>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>✦</div>
              <p style={{ fontStyle: 'italic' }}>No highlights yet. Open a book and save memorable passages.</p>
            </div>
          ) : (
            allHighlights.map((h, i) => (
              <div key={i} style={{ borderLeft: '3px solid #c9a84c', background: '#fffde8', padding: '12px 16px', marginBottom: '12px' }}>
                <p style={{ fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '6px' }}>"{h.text}"</p>
                <p style={{ fontSize: '0.72rem', color: '#7a6a57', textTransform: 'uppercase', letterSpacing: '0.1em' }}>— {h.book}, {h.author}</p>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'discover' && (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontStyle: 'italic' }}>What to Read Next</h2>
        <p style={{ color: '#7a6a57', fontSize: '0.85rem', marginTop: '4px' }}>Based on your reading history</p>
      </div>
      <button onClick={getRecommendations} disabled={recLoading} style={{ background: '#1a1410', color: '#faf7f2', border: 'none', padding: '8px 18px', fontFamily: 'Georgia, serif', fontSize: '0.8rem', cursor: 'pointer' }}>
        {recLoading ? 'Thinking...' : recsFetched ? 'Refresh' : 'Get Recommendations'}
      </button>
    </div>

    {!recsFetched && !recLoading && (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6a57' }}>
        <div style={{ fontSize: '3rem', marginBottom: '14px' }}>◈</div>
        <p style={{ fontStyle: 'italic' }}>Click "Get Recommendations" and I'll suggest books based on what you've read and loved.</p>
      </div>
    )}

    {recLoading && (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6a57' }}>
        <p style={{ fontStyle: 'italic' }}>Analyzing your reading taste...</p>
      </div>
    )}

    {recsFetched && !recLoading && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
        {recs.map((r: any, i: number) => (
          <div key={i} style={{ background: '#faf7f2', border: '1.5px solid #d4c5a9', borderRadius: '2px', padding: '16px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>{r.title}</div>
            <div style={{ fontSize: '0.75rem', color: '#7a6a57', fontStyle: 'italic', marginBottom: '8px' }}>{r.author}</div>
            {r.genre && <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 7px', border: '1px solid #d4c5a9', color: '#7a6a57' }}>{r.genre}</span>}
            <p style={{ fontSize: '0.78rem', color: '#7a6a57', marginTop: '8px', lineHeight: '1.5', fontStyle: 'italic' }}>{r.reason}</p>
          </div>
        ))}
      </div>
    )}
  </div>
)}

      {activeBook && editData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => { setActiveBook(null); setEditData(null); setGeneratedReview('') }}>
          <div style={{ background: '#faf7f2', border: '2px solid #1a1410', borderRadius: '2px', width: '100%', maxWidth: '560px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { setActiveBook(null); setEditData(null); setGeneratedReview('') }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#7a6a57' }}>×</button>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              {activeBook.cover
                ? <img src={activeBook.cover} style={{ width: '80px', height: '120px', objectFit: 'cover', border: '1.5px solid #d4c5a9', flexShrink: 0 }} alt="" />
                : <div style={{ width: '80px', height: '120px', background: '#ede6d6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontStyle: 'italic', color: '#7a6a57', textAlign: 'center', padding: '8px', flexShrink: 0 }}>{activeBook.title}</div>
              }
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>{activeBook.title}</h2>
                <p style={{ fontStyle: 'italic', color: '#7a6a57', marginBottom: '8px' }}>{activeBook.author}</p>
                {activeBook.genre && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', border: '1px solid #d4c5a9', color: '#7a6a57' }}>{activeBook.genre}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1.5px solid #d4c5a9', marginBottom: '20px' }}>
              {['details', 'debrief', 'highlights'].map(t => (
                <button key={t} onClick={() => setModalTab(t)} style={{
                  background: 'none', border: 'none', borderBottom: modalTab === t ? '2px solid #1a1410' : '2px solid transparent',
                  padding: '8px 16px', fontFamily: 'Georgia, serif', fontSize: '0.82rem', cursor: 'pointer',
                  color: modalTab === t ? '#1a1410' : '#7a6a57', marginBottom: '-1.5px', textTransform: 'capitalize'
                }}>{t}</button>
              ))}
            </div>

            {modalTab === 'details' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a6a57', display: 'block', marginBottom: '6px' }}>Status</label>
                    <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#f5f0e8' }}>
                      <option value="want">Want to Read</option>
                      <option value="reading">Currently Reading</option>
                      <option value="finished">Finished</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a6a57', display: 'block', marginBottom: '6px' }}>Rating</label>
                    <select value={editData.rating} onChange={e => setEditData({ ...editData, rating: parseInt(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#f5f0e8' }}>
                      <option value={0}>No rating</option>
                      <option value={1}>★ 1</option><option value={2}>★★ 2</option><option value={3}>★★★ 3</option><option value={4}>★★★★ 4</option><option value={5}>★★★★★ 5</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a6a57', display: 'block', marginBottom: '6px' }}>Notes</label>
                  <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#f5f0e8', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a6a57', display: 'block', marginBottom: '6px' }}>
                    My Review {generatedReview && <span style={{ color: '#2e7d32', marginLeft: '8px' }}>✓ Generated from debrief</span>}
                  </label>
                  <textarea value={generatedReview || editData.review || ''} onChange={e => { setGeneratedReview(e.target.value); setEditData({ ...editData, review: e.target.value }) }}
                    style={{ width: '100%', padding: '8px 12px', fontFamily: 'Georgia, serif', border: generatedReview ? '1.5px solid #2e7d32' : '1.5px solid #d4c5a9', background: '#f5f0e8', minHeight: '120px', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={handleDeleteBook} style={{ padding: '8px 18px', fontFamily: 'Georgia, serif', background: 'transparent', border: '1.5px solid #c0392b', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setActiveBook(null); setEditData(null); setGeneratedReview('') }} style={{ padding: '8px 18px', fontFamily: 'Georgia, serif', background: 'transparent', border: '1.5px solid #1a1410', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleUpdateBook} style={{ padding: '8px 18px', fontFamily: 'Georgia, serif', background: '#1a1410', color: '#faf7f2', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                  </div>
                </div>
              </>
            )}

            {modalTab === 'debrief' && (
              <>
                <p style={{ fontSize: '0.82rem', color: '#7a6a57', marginBottom: '12px', fontStyle: 'italic' }}>Chat with Claude about this book — then generate a personal review from your conversation.</p>
                <div style={{ border: '1.5px solid #d4c5a9', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ background: '#1a1410', color: '#faf7f2', padding: '8px 14px', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Book Debrief</div>
                  <div ref={chatRef} style={{ padding: '14px', maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f5f0e8' }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{
                        maxWidth: '85%', padding: '10px 14px', borderRadius: '2px', fontSize: '0.88rem', lineHeight: '1.55',
                        background: m.role === 'ai' ? '#faf7f2' : '#1a1410',
                        color: m.role === 'ai' ? '#1a1410' : '#faf7f2',
                        border: m.role === 'ai' ? '1.5px solid #d4c5a9' : 'none',
                        alignSelf: m.role === 'ai' ? 'flex-start' : 'flex-end'
                      }}>{m.text}</div>
                    ))}
                    {chatLoading && (
                      <div style={{ background: '#faf7f2', border: '1.5px solid #d4c5a9', padding: '10px 14px', borderRadius: '2px', alignSelf: 'flex-start', fontSize: '0.88rem', color: '#7a6a57', fontStyle: 'italic' }}>Thinking...</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', borderTop: '1.5px solid #d4c5a9', background: '#faf7f2' }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                      placeholder="Share your thoughts..." style={{ flex: 1, padding: '10px 14px', fontFamily: 'Georgia, serif', fontSize: '0.88rem', border: 'none', background: 'transparent', outline: 'none' }} />
                    <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                      style={{ background: '#1a1410', color: '#faf7f2', border: 'none', padding: '10px 18px', fontFamily: 'Georgia, serif', fontSize: '0.8rem', cursor: 'pointer' }}>Send</button>
                  </div>
                </div>
                {chatMessages.length > 3 && (
                  <button onClick={generateReview} disabled={chatLoading}
                    style={{ width: '100%', padding: '10px', fontFamily: 'Georgia, serif', background: 'transparent', border: '1.5px solid #1a1410', cursor: 'pointer', fontSize: '0.85rem' }}>
                    ✦ Generate My Review from This Conversation
                  </button>
                )}
              </>
            )}

            {modalTab === 'highlights' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7a6a57', display: 'block', marginBottom: '6px' }}>Add a highlight</label>
                  <textarea value={newHighlight} onChange={e => setNewHighlight(e.target.value)}
                    placeholder="Paste a memorable passage..."
                    style={{ width: '100%', padding: '8px 12px', fontFamily: 'Georgia, serif', border: '1.5px solid #d4c5a9', background: '#f5f0e8', minHeight: '80px', resize: 'vertical', marginBottom: '8px' }} />
                  <button onClick={addHighlight} style={{ padding: '8px 18px', fontFamily: 'Georgia, serif', background: '#1a1410', color: '#faf7f2', border: 'none', cursor: 'pointer' }}>Save Highlight</button>
                </div>
                <hr style={{ border: 'none', borderTop: '1.5px solid #d4c5a9', margin: '16px 0' }} />
                {(activeBook.highlights || []).length === 0 ? (
                  <p style={{ color: '#7a6a57', fontStyle: 'italic', fontSize: '0.88rem' }}>No highlights yet.</p>
                ) : (
                  (activeBook.highlights || []).map((h: string, i: number) => (
                    <div key={i} style={{ borderLeft: '3px solid #c9a84c', background: '#fffde8', padding: '12px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <p style={{ fontStyle: 'italic', fontSize: '0.88rem', lineHeight: '1.6' }}>"{h}"</p>
                      <button onClick={() => deleteHighlight(i)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>×</button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}