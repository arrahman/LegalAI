import path from "node:path";
import fs from "node:fs/promises";
import { chunkLegalText } from "./chunk";
import { embedTexts } from "./openai";
import { safeId } from "./text";
import { DocumentType, LegalDocument } from "./types";

const root = process.cwd();
const documentsDir = path.join(root, "data", "documents");
const uploadsDir = path.join(root, "data", "uploads");

export async function ensureDataDirs() {
  await fs.mkdir(documentsDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });
}

function documentPath(id: string) {
  return path.join(documentsDir, `${id}.json`);
}

export async function saveUpload(file: File) {
  await ensureDataDirs();
  const bytes = Buffer.from(await file.arrayBuffer());
  const cleanName = file.name.replace(/[^\w.\- ]/g, "_");
  const fileName = `${Date.now()}-${cleanName}`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, bytes);
  return { filePath, fileName };
}

export async function createDocument(input: {
  originalName: string;
  fileName: string;
  mimeType: string;
  documentType: DocumentType;
  text: string;
}) {
  await ensureDataDirs();
  const chunks = chunkLegalText(input.text);
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
  const chunksWithEmbeddings = chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings?.[index]
  }));

  const document: LegalDocument = {
    id: safeId("doc"),
    fileName: input.fileName,
    originalName: input.originalName,
    mimeType: input.mimeType,
    documentType: input.documentType,
    uploadedAt: new Date().toISOString(),
    charCount: input.text.length,
    chunkCount: chunks.length,
    chunks: chunksWithEmbeddings
  };

  await fs.writeFile(documentPath(document.id), JSON.stringify(document, null, 2));
  return document;
}

export async function updateDocument(document: LegalDocument) {
  await ensureDataDirs();
  await fs.writeFile(documentPath(document.id), JSON.stringify(document, null, 2));
}

export async function getDocument(id: string) {
  await ensureDataDirs();
  try {
    const raw = await fs.readFile(documentPath(id), "utf8");
    return JSON.parse(raw) as LegalDocument;
  } catch {
    return undefined;
  }
}

export async function listDocuments() {
  await ensureDataDirs();
  const files = await fs.readdir(documentsDir);
  const documents = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(documentsDir, file), "utf8");
        const document = JSON.parse(raw) as LegalDocument;
        return {
          id: document.id,
          originalName: document.originalName,
          documentType: document.documentType,
          uploadedAt: document.uploadedAt,
          charCount: document.charCount,
          chunkCount: document.chunkCount
        };
      })
  );
  return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
