import { embedTexts } from "./openai";
import { tokenize } from "./text";
import { Citation, DocumentChunk, LegalDocument } from "./types";

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag) || 1);
}

function keywordScore(query: string, chunk: DocumentChunk) {
  const queryTerms = new Set(tokenize(query));
  const chunkTerms = tokenize(`${chunk.heading} ${chunk.text}`);
  if (!queryTerms.size || !chunkTerms.length) return 0;
  const matches = chunkTerms.filter((term) => queryTerms.has(term)).length;
  return matches / Math.sqrt(chunkTerms.length);
}

export async function retrieveRelevantChunks(document: LegalDocument, query: string, limit = 5) {
  const hasStoredEmbeddings = document.chunks.every((chunk) => chunk.embedding?.length);
  const queryEmbedding = hasStoredEmbeddings ? (await embedTexts([query]))?.[0] : undefined;

  const scored = document.chunks.map((chunk) => {
    const semanticScore =
      queryEmbedding && chunk.embedding ? cosine(queryEmbedding, chunk.embedding) : 0;
    const fallbackScore = keywordScore(query, chunk);
    return {
      chunk,
      score: semanticScore || fallbackScore
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk, score }) => ({ chunk, score }));
}

export function toCitation(document: LegalDocument, chunk: DocumentChunk, score: number): Citation {
  return {
    documentId: document.id,
    chunkId: chunk.id,
    label: `${document.originalName}, chunk ${chunk.index}: ${chunk.heading}`,
    snippet: chunk.text.slice(0, 700),
    score
  };
}
