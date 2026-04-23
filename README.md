# Legal Document AI

Legal Document AI is a Next.js RAG MVP for uploading legal documents, asking questions about them, extracting important clauses, generating summaries, and comparing agreements.

The project is designed for documents such as:

- NDAs
- service agreements
- employment contracts
- vendor agreements
- lease agreements

It is a real RAG workflow, but it is intentionally local-first for the MVP. It stores document metadata, chunks, and embeddings in local JSON files instead of using a production vector database.

## What It Does

- Upload PDF, DOCX, TXT, or Markdown documents.
- Extract and normalize document text.
- Split documents into citation-ready chunks.
- Generate OpenAI embeddings when `OPENAI_API_KEY` is configured.
- Store chunks and embeddings locally under `data/documents`.
- Retrieve relevant chunks using vector similarity when embeddings exist.
- Fall back to keyword retrieval when embeddings are unavailable.
- Ask questions about a selected document.
- Return answers with source citations.
- Generate concise contract summaries.
- Extract common legal clause categories.
- Compare two documents for missing or different clauses.

## RAG Pipeline

The app follows this flow:

```text
User uploads document
        |
        v
Extract text from PDF/DOCX/TXT/MD
        |
        v
Normalize and chunk text
        |
        v
Create embeddings with OpenAI
        |
        v
Save chunks + embeddings to local JSON
        |
        v
User asks a question
        |
        v
Retrieve relevant chunks
        |
        v
Send question + retrieved context to OpenAI
        |
        v
Return answer with cited source snippets
```

## Current Storage

This MVP does not use a dedicated vector database yet.

Current storage:

- uploaded files: `data/uploads`
- document records, chunks, and embeddings: `data/documents/*.json`

Retrieval is done by loading the document JSON and calculating similarity in memory.

For production, replace the local JSON store with:

- PostgreSQL + pgvector
- Pinecone
- Weaviate
- Chroma

## Tech Stack

- Next.js App Router
- React
- TypeScript
- OpenAI API
- OpenAI embeddings
- `pdf-parse` for PDFs
- `mammoth` for DOCX files
- local JSON file storage for the MVP

## Project Structure

```text
app/
  api/documents/
    route.ts              List indexed documents
    upload/route.ts       Upload and index documents
    chat/route.ts         Ask questions using RAG
    summary/route.ts      Generate summaries
    clauses/route.ts      Extract clause categories
    compare/route.ts      Compare two documents
  globals.css             App styling
  layout.tsx              Root layout
  page.tsx                Main UI

lib/
  chunk.ts                Text chunking
  clauseDetector.ts       Clause extraction and comparison
  documentStore.ts        Local document/chunk/embedding storage
  extractText.ts          PDF/DOCX/TXT extraction
  openai.ts               OpenAI client and model settings
  rag.ts                  RAG answer and summary logic
  retrieval.ts            Vector/keyword retrieval
  text.ts                 Text utilities
  types.ts                Shared types

data/
  uploads/                Uploaded source files
  documents/              Local JSON document records
```

## Prerequisites

Install these first:

- Node.js 20 or newer
- npm
- an OpenAI API key

Check your versions:

```powershell
node --version
npm --version
```

## Step-by-Step Installation

### 1. Open the project folder

### 2. Install dependencies

```powershell
npm install
```

### 3. Create your environment file

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Or create `.env` manually in the project root.

### 4. Add your OpenAI settings

Open `.env` and add:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_CHAT_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Recommended MVP models:

- `gpt-5-mini` for chat, summaries, and legal Q&A
- `text-embedding-3-small` for document chunk embeddings

For higher quality at higher cost:

```env
OPENAI_CHAT_MODEL=gpt-5.1
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

### 5. Start the development server

```powershell
npm run dev
```

### 6. Open the app

Go to:

```text
http://127.0.0.1:3000
```

or:

```text
http://localhost:3000
```

### 7. Upload a document

Use the upload form to add a PDF, DOCX, TXT, or Markdown file.

After upload, the app will:

- extract text
- split it into chunks
- create embeddings if `OPENAI_API_KEY` is set
- save the indexed document locally

### 8. Ask questions

Try prompts such as:

```text
Summarize this contract.
What are the payment terms?
Is there an auto-renewal clause?
What are the termination conditions?
Find risky clauses in this agreement.
```

## Available Scripts

Start the development server:

```powershell
npm run dev
```

Run a production build:

```powershell
npm run build
```

Start the production server after building:

```powershell
npm run start
```

Run TypeScript checks:

```powershell
npm run typecheck
```

## API Routes

### List documents

```text
GET /api/documents
```

### Upload document

```text
POST /api/documents/upload
```

Form fields:

- `file`
- `documentType`

### Ask a document question

```text
POST /api/documents/chat
```

Body:

```json
{
  "documentId": "doc_id_here",
  "question": "What are the payment terms?"
}
```

### Generate summary

```text
POST /api/documents/summary
```

Body:

```json
{
  "documentId": "doc_id_here"
}
```

### Extract clauses

```text
POST /api/documents/clauses
```

Body:

```json
{
  "documentId": "doc_id_here"
}
```

### Compare documents

```text
POST /api/documents/compare
```

Body:

```json
{
  "baseDocumentId": "standard_doc_id_here",
  "candidateDocumentId": "uploaded_doc_id_here"
}
```

## Clause Categories

The MVP looks for these clause categories:

- confidentiality
- payment terms
- termination
- liability
- indemnity
- dispute resolution
- governing law
- renewal
- intellectual property

Clause extraction is deterministic and retrieval-based in this MVP. It is useful for demos and first-pass review, but it should not be treated as legal advice.

## Important Limitations

- This is not legal advice.
- It does not replace lawyer review.
- It does not currently use a production vector database.
- It does not include user accounts or document permissions.
- Scanned PDFs may not work unless OCR is added.
- Some dynamic PDFs may extract only placeholder text.
- Documents uploaded before adding `OPENAI_API_KEY` may not have embeddings. Re-upload them after setting the key.

## Troubleshooting

### OpenAI is not configured

If you see:

```text
OpenAI is not configured...
```

Check that `.env` exists in the project root and includes:

```env
OPENAI_API_KEY=your_api_key_here
```

Then restart the server:

```powershell
npm run dev
```

### The answer only shows retrieved excerpts

This usually means the app could not create an OpenAI client. Check your `.env` file and restart the server.

### PDF uploads but has no contract text

Some PDFs are scanned, protected, or dynamic forms. The current MVP uses text extraction, not OCR.

If extraction returns placeholder text such as:

```text
Please wait...
If this message is not eventually replaced...
```

you need OCR support or a different PDF extraction pipeline.

### Port 3000 is already in use

Stop the other process or run Next on another port:

```powershell
npm run dev -- -p 3001
```

Then open:

```text
http://127.0.0.1:3001
```

## Production Roadmap

Good next steps:

- Replace local JSON storage with PostgreSQL.
- Add pgvector for vector search.
- Store uploaded files in S3 or compatible object storage.
- Add authentication and user-scoped document access.
- Add OCR for scanned PDFs.
- Add better legal clause classifiers.
- Add obligations, dates, renewal alerts, and deadline extraction.
- Add a standard-template comparison workflow.
- Add tests for ingestion, retrieval, and API routes.

## License

This project is currently for MVP/demo use. Add a license before publishing or distributing it.
