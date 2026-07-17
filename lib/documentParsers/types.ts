export const documentParserIds = ["extract_text", "docling"] as const;

export type DocumentParserId = (typeof documentParserIds)[number];

export type DocumentParserInput = {
  filePath: string;
  mimeType: string;
  fileName: string;
};

export interface DocumentParser {
  parse(input: DocumentParserInput): Promise<string>;
}
