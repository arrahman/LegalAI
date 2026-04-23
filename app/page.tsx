"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ListedDocument = {
  id: string;
  originalName: string;
  documentType: string;
  uploadedAt: string;
  charCount: number;
  chunkCount: number;
};

type Citation = {
  label: string;
  snippet: string;
  score: number;
};

type Clause = {
  category: string;
  title: string;
  present: boolean;
  confidence: number;
  excerpt?: string;
  risk?: "low" | "medium" | "high";
  note?: string;
};

type Comparison = {
  title: string;
  status: "missing_in_uploaded" | "new_in_uploaded" | "needs_review";
  baseExcerpt?: string;
  candidateExcerpt?: string;
  note: string;
};

const starterQuestions = [
  "Summarize this contract.",
  "What are the payment terms?",
  "Is there an auto-renewal clause?",
  "What are the termination conditions?",
  "Find risky clauses in this agreement."
];

async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "The server returned an unreadable response." };
  }
}

export default function Home() {
  const [documents, setDocuments] = useState<ListedDocument[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [compareId, setCompareId] = useState("");
  const [documentType, setDocumentType] = useState("nda");
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [answer, setAnswer] = useState("");
  const [summary, setSummary] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [comparison, setComparison] = useState<Comparison[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedId),
    [documents, selectedId]
  );

  async function loadDocuments() {
    try {
      const response = await fetch("/api/documents");
      const data = await safeJson(response);
      setDocuments(data.documents || []);
      if (!selectedId && data.documents?.[0]) setSelectedId(data.documents[0].id);
    } catch {
      setError("Could not reach the server. Make sure npm run dev is still running.");
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy("upload");
    setError("");

    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);

    let response: Response;
    let data: any;
    try {
      response = await fetch("/api/documents/upload", {
        method: "POST",
        body: form
      });
      data = await safeJson(response);
    } catch {
      setBusy("");
      setError("Upload failed because the server connection was interrupted.");
      return;
    }
    setBusy("");

    if (!response.ok) {
      setError(data.error || "Upload failed.");
      return;
    }

    setSelectedId(data.document.id);
    setFile(null);
    await loadDocuments();
  }

  async function askQuestion(event?: FormEvent, override?: string) {
    event?.preventDefault();
    const prompt = override || question;
    if (!selectedId || !prompt) return;
    setBusy("chat");
    setError("");
    setAnswer("");
    setSummary("");

    let response: Response;
    let data: any;
    try {
      response = await fetch("/api/documents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedId, question: prompt })
      });
      data = await safeJson(response);
    } catch {
      setBusy("");
      setError("Question failed because the server connection was interrupted.");
      return;
    }
    setBusy("");

    if (!response.ok) {
      setError(data.error || "Question failed.");
      return;
    }

    setQuestion(prompt);
    setAnswer(data.answer);
    setCitations(data.citations || []);
  }

  async function runSummary() {
    if (!selectedId) return;
    setBusy("summary");
    setError("");
    setAnswer("");
    let response: Response;
    let data: any;
    try {
      response = await fetch("/api/documents/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedId })
      });
      data = await safeJson(response);
    } catch {
      setBusy("");
      setError("Summary failed because the server connection was interrupted.");
      return;
    }
    setBusy("");
    if (!response.ok) return setError(data.error || "Summary failed.");
    setSummary(data.summary);
    setCitations(data.citations || []);
  }

  async function runClauses() {
    if (!selectedId) return;
    setBusy("clauses");
    setError("");
    let response: Response;
    let data: any;
    try {
      response = await fetch("/api/documents/clauses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedId })
      });
      data = await safeJson(response);
    } catch {
      setBusy("");
      setError("Clause extraction failed because the server connection was interrupted.");
      return;
    }
    setBusy("");
    if (!response.ok) return setError(data.error || "Clause extraction failed.");
    setClauses(data.clauses || []);
  }

  async function runComparison() {
    if (!selectedId || !compareId) return;
    setBusy("compare");
    setError("");
    let response: Response;
    let data: any;
    try {
      response = await fetch("/api/documents/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseDocumentId: compareId, candidateDocumentId: selectedId })
      });
      data = await safeJson(response);
    } catch {
      setBusy("");
      setError("Comparison failed because the server connection was interrupted.");
      return;
    }
    setBusy("");
    if (!response.ok) return setError(data.error || "Comparison failed.");
    setComparison(data.comparison || []);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Legal Document AI</h1>
          <p>Upload contracts, retrieve clauses, and answer questions with cited source text.</p>
        </div>

        <form className="upload" onSubmit={uploadDocument}>
          <label className="field">
            Document type
            <select
              className="select"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              <option value="nda">NDA</option>
              <option value="service_agreement">Service agreement</option>
              <option value="employment_contract">Employment contract</option>
              <option value="vendor_agreement">Vendor agreement</option>
              <option value="lease_agreement">Lease agreement</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field">
            File
            <input
              className="input"
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <button className="primary" disabled={!file || busy === "upload"}>
            {busy === "upload" ? "Uploading..." : "Upload and index"}
          </button>
          {error ? <div className="error">{error}</div> : null}
        </form>

        <div className="document-list">
          {documents.map((document) => (
            <button
              className={`doc-button ${document.id === selectedId ? "active" : ""}`}
              key={document.id}
              onClick={() => setSelectedId(document.id)}
            >
              <span className="doc-title">{document.originalName}</span>
              <span className="doc-meta">
                {document.documentType.replace(/_/g, " ")} | {document.chunkCount} chunks
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <h2>{selectedDocument?.originalName || "No document selected"}</h2>
          <p>
            {selectedDocument
              ? `${selectedDocument.charCount.toLocaleString()} characters indexed across ${selectedDocument.chunkCount} citation chunks.`
              : "Upload an NDA or service agreement to start reviewing."}
          </p>
        </header>

        <div className="workspace">
          {!selectedDocument ? (
            <div className="empty">Start by uploading a PDF, DOCX, TXT, or Markdown contract.</div>
          ) : (
            <>
              <div className="toolbar">
                <button className="secondary" onClick={runSummary} disabled={busy === "summary"}>
                  {busy === "summary" ? "Summarizing..." : "Concise summary"}
                </button>
                <button className="secondary" onClick={runClauses} disabled={busy === "clauses"}>
                  {busy === "clauses" ? "Extracting..." : "Extract clauses"}
                </button>
                <select
                  className="select"
                  value={compareId}
                  onChange={(event) => setCompareId(event.target.value)}
                  style={{ maxWidth: 280 }}
                >
                  <option value="">Compare with standard...</option>
                  {documents
                    .filter((document) => document.id !== selectedId)
                    .map((document) => (
                      <option value={document.id} key={document.id}>
                        {document.originalName}
                      </option>
                    ))}
                </select>
                <button className="secondary" onClick={runComparison} disabled={!compareId || busy === "compare"}>
                  {busy === "compare" ? "Comparing..." : "Compare"}
                </button>
              </div>

              <section className="panel">
                <h3>Ask the document</h3>
                <form className="chat-form" onSubmit={(event) => askQuestion(event)}>
                  <textarea
                    className="textarea"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <button className="primary" disabled={busy === "chat"}>
                    {busy === "chat" ? "Answering..." : "Ask"}
                  </button>
                </form>
                <div className="toolbar" style={{ marginTop: 12 }}>
                  {starterQuestions.slice(1).map((starter) => (
                    <button className="secondary" key={starter} onClick={() => askQuestion(undefined, starter)}>
                      {starter}
                    </button>
                  ))}
                </div>
              </section>

              {answer || summary ? (
                <section className="panel">
                  <h3>{summary ? "Summary" : "Answer"}</h3>
                  <div className="answer">{summary || answer}</div>
                </section>
              ) : null}

              {clauses.length ? (
                <section className="panel">
                  <h3>Clause extraction</h3>
                  <div className="clause-grid">
                    {clauses.map((clause) => (
                      <div className="clause" key={clause.category}>
                        <strong>
                          {clause.title}
                          <span className={`badge ${clause.risk || "low"}`}>{clause.present ? "found" : "missing"}</span>
                        </strong>
                        <div className="note">{clause.note}</div>
                        {clause.excerpt ? <p className="snippet">{clause.excerpt}</p> : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {comparison.length ? (
                <section className="panel">
                  <h3>Contract comparison</h3>
                  <div className="comparison-grid">
                    {comparison.map((item) => (
                      <div className="comparison" key={item.title}>
                        <strong>
                          {item.title}
                          <span className={`badge ${item.status}`}>{item.status.replace(/_/g, " ")}</span>
                        </strong>
                        <p className="note">{item.note}</p>
                        {item.baseExcerpt ? <p className="snippet">Standard: {item.baseExcerpt}</p> : null}
                        {item.candidateExcerpt ? <p className="snippet">Uploaded: {item.candidateExcerpt}</p> : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {citations.length ? (
                <section className="panel">
                  <h3>Sources</h3>
                  <div className="citation-list">
                    {citations.map((citation, index) => (
                      <div className="citation" key={`${citation.label}-${index}`}>
                        <strong>
                          [{index + 1}] {citation.label}
                        </strong>
                        <div className="snippet">{citation.snippet}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
