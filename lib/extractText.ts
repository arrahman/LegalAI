import { normalizeText } from "./text";

export async function extractTextFromFile(filePath: string, mimeType: string, fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    const fs = await import("node:fs/promises");
    const pdfParse = (await import("pdf-parse")).default;
    const data = await fs.readFile(filePath);
    const result = await pdfParse(data);
    return normalizeText(result.text);
  }

  if (
    mimeType.includes("wordprocessingml.document") ||
    lowerName.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return normalizeText(result.value);
  }

  if (
    mimeType.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md")
  ) {
    const fs = await import("node:fs/promises");
    return normalizeText(await fs.readFile(filePath, "utf8"));
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.");
}
