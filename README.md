# Hopscotch 📚

A full-stack personal reading companion web app built from scratch.

**Live site:** https://hopscotch-ecru.vercel.app  
**GitHub:** https://github.com/marinacarles7/Hopscotch

---

## What it does

Hopscotch helps readers track, reflect on, and discover books. It solves a real problem — platforms like Kindle Unlimited have no good way to keep track of what you've read, and writing reviews feels like homework. Hopscotch makes both effortless.

**Features:**
- Search and add books using the Google Books API, with covers, author, and genre auto-filled
- Track reading status (want to read, currently reading, finished) and star ratings
- Import your entire Goodreads library via CSV in one click
- AI-powered book debrief — chat with Claude about a book you finished, then auto-generate a personalized review from your conversation
- Save favorite quotes and passages in a personal highlights collection
- AI book recommendations based on your reading history
- Full CRUD — add, edit, and delete books from your library

---

## What I built

This was my first full-stack web project. I built everything from scratch including:

- A React frontend with Next.js and TypeScript
- A PostgreSQL database using Supabase to store books, highlights, and reviews
- Secure backend API routes that keep secret keys off the client
- Integration with the Anthropic Claude API for AI features
- Integration with the Google Books API for book search and metadata
- A Goodreads CSV parser to import an existing reading library
- Deployment on Vercel with environment variables

---

## What I learned

**Environment setup**
- Installed and configured Node.js, Homebrew, and VS Code on Mac
- Set up a Next.js project from scratch

**Frontend**
- Built a React UI with hooks (useState, useEffect, useRef)
- Created reusable components for book cards, modals, and chat
- Managed complex UI state across multiple views and tabs

**Backend**
- Created secure Next.js API routes that run server-side
- Used environment variables to keep API keys safe and off the browser
- Understood the difference between public and private keys

**Database**
- Designed a PostgreSQL database schema in Supabase
- Wrote REST API calls to read, create, update, and delete records
- Stored arrays (highlights) in a database column

**APIs**
- Integrated the Anthropic Claude API for conversational AI features
- Integrated the Google Books API for book search and cover images
- Parsed and imported Goodreads CSV export files

**Deployment**
- Used Git and GitHub for version control
- Deployed a full-stack app to Vercel
- Configured environment variables in production
- Understood how automatic redeployment works on push

---

## Tech stack

- **Frontend:** Next.js (React), TypeScript
- **Backend:** Next.js API routes (serverless functions)
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API
- **Book data:** Google Books API
- **Deployment:** Vercel
- **Version control:** Git + GitHub

---

## Running locally

1. Clone the repo: `git clone https://github.com/marinacarles7/Hopscotch.git`
2. Install dependencies: `npm install`
3. Create a `.env.local` file with the following keys:
