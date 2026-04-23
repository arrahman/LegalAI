import { DocumentChunk } from "./types";
import { estimateTokens, normalizeText, safeId } from "./text";

const headingPattern =
  /^(article|section|clause|schedule|exhibit)?\s*(\d+(\.\d+)*|[ivxlcdm]+|[a-z])?[\).:-]?\s+[A-Z][A-Za-z0-9 ,/&()-]{3,}$/i;

export function chunkLegalText(text: string, targetChars = 1800): DocumentChunk[] {
  const normalized = normalizeText(text);
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: DocumentChunk[] = [];
  let buffer: string[] = [];
  let heading = "Opening provisions";

  function flush() {
    const body = buffer.join("\n\n").trim();
    if (!body) return;
    chunks.push({
      id: safeId("chunk"),
      index: chunks.length + 1,
      heading,
      text: body,
      tokensEstimate: estimateTokens(body)
    });
    buffer = [];
  }

  for (const paragraph of paragraphs) {
    const looksLikeHeading = paragraph.length < 120 && headingPattern.test(paragraph);
    if (looksLikeHeading && buffer.length > 0) {
      flush();
      heading = paragraph;
      continue;
    }

    const currentLength = buffer.join("\n\n").length;
    if (currentLength + paragraph.length > targetChars && buffer.length > 0) {
      flush();
    }
    buffer.push(paragraph);
  }

  flush();
  return chunks.length
    ? chunks
    : [
        {
          id: safeId("chunk"),
          index: 1,
          heading,
          text: normalized,
          tokensEstimate: estimateTokens(normalized)
        }
      ];
}
