const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('Supabase URL:', SUPABASE_URL)

export async function getBooks() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books?order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  const data = await res.json()
  console.log('getBooks response:', data)
  return Array.isArray(data) ? data : []
}

export async function insertBook(book) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(book)
  })
  const data = await res.json()
  console.log('insertBook response:', data)
  return Array.isArray(data) ? data : []
}

export async function updateBook(id, updates) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updates)
  })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function deleteBook(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
}

export async function updateHighlights(id, highlights) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ highlights })
  })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}