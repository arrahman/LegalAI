export type DocumentType =
  | "nda"
  | "service_agreement"
  | "employment_contract"
  | "vendor_agreement"
  | "lease_agreement"
  | "other";

export type ClauseCategory =
  | "confidentiality"
  | "payment_terms"
  | "termination"
  | "liability"
  | "indemnity"
  | "dispute_resolution"
  | "governing_law"
  | "renewal"
  | "intellectual_property";

export type Citation = {
  documentId: string;
  chunkId: string;
  label: string;
  snippet: string;
  score: number;
};

export type DocumentChunk = {
  id: string;
  index: number;
  heading: string;
  text: string;
  tokensEstimate: number;
  embedding?: number[];
};

export type LegalDocument = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  documentType: DocumentType;
  uploadedAt: string;
  charCount: number;
  chunkCount: number;
  summary?: string;
  chunks: DocumentChunk[];
};

export type ClauseFinding = {
  category: ClauseCategory;
  title: string;
  present: boolean;
  confidence: number;
  excerpt?: string;
  citation?: Citation;
  risk?: "low" | "medium" | "high";
  note?: string;
};
