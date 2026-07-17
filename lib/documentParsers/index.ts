import { DoclingParser } from "./doclingParser";
import { ExtractTextParser } from "./extractTextParser";
import type { DocumentParser, DocumentParserId } from "./types";

export type { DocumentParser, DocumentParserId } from "./types";
export { documentParserIds } from "./types";

export function createDocumentParser(parserId: DocumentParserId): DocumentParser {
  switch (parserId) {
    case "docling":
      return new DoclingParser();
    case "extract_text":
      return new ExtractTextParser();
  }
}
