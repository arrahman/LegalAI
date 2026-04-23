import { getOpenAIClient, chatModel } from "./openai";
import { retrieveRelevantChunks, toCitation } from "./retrieval";
import { trimSnippet } from "./text";
import { LegalDocument } from "./types";

const legalGuardrail =
  "You are a legal document assistant. Provide practical document analysis, not legal advice. Answer only from the provided excerpts. If the answer is not supported by the excerpts, say what is missing. Include citations by bracket number.";

export async function answerQuestion(document: LegalDocument, question: string) {
  const retrieved = await retrieveRelevantChunks(document, question, 6);
  const citations = retrieved.map(({ chunk, score }) => toCitation(document, chunk, score));
  const context = citations
    .map((citation, index) => `[${index + 1}] ${citation.label}\n${citation.snippet}`)
    .join("\n\n");

  const openai = getOpenAIClient();
  if (!openai) {
    return {
      answer:
        "OpenAI is not configured, so here are the most relevant retrieved excerpts. Set OPENAI_API_KEY to enable generated answers with citations.",
      citations: citations.map((citation) => ({
        ...citation,
        snippet: trimSnippet(citation.snippet)
      }))
    };
  }

  const response = await openai.chat.completions.create({
    model: chatModel(),
    messages: [
      { role: "system", content: legalGuardrail },
      {
        role: "user",
        content: `Question: ${question}\n\nDocument excerpts:\n${context}\n\nReturn a concise answer. Every factual claim must include bracket citations like [1].`
      }
    ]
  });

  return {
    answer: response.choices[0]?.message.content?.trim() || "No answer was generated.",
    citations: citations.map((citation) => ({
      ...citation,
      snippet: trimSnippet(citation.snippet)
    }))
  };
}

export async function summarizeDocument(document: LegalDocument) {
  const highSignal = document.chunks.slice(0, 10);
  const citations = highSignal.map((chunk) => toCitation(document, chunk, 1));
  const openai = getOpenAIClient();

  if (!openai) {
    return {
      summary: trimSnippet(document.chunks.map((chunk) => chunk.text).join("\n\n"), 1200),
      citations
    };
  }

  const context = highSignal
    .map((chunk, index) => `[${index + 1}] ${chunk.heading}\n${chunk.text}`)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: chatModel(),
    messages: [
      { role: "system", content: legalGuardrail },
      {
        role: "user",
        content: `Create a concise contract summary covering parties, purpose, payment, confidentiality, term, renewal, termination, liability, indemnity, governing law, and notable risks. Cite every point.\n\n${context}`
      }
    ]
  });

  return {
    summary: response.choices[0]?.message.content?.trim() || "No summary was generated.",
    citations
  };
}
