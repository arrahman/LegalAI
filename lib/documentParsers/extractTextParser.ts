import { extractTextFromFile } from "../extractText";
import type { DocumentParser } from "./types";

export class ExtractTextParser implements DocumentParser {
  parse({ filePath, mimeType, fileName }: Parameters<DocumentParser["parse"]>[0]) {
    return extractTextFromFile(filePath, mimeType, fileName);
  }
}
