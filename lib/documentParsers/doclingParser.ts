import fs from "node:fs/promises";
import { normalizeText } from "../text";
import type { DocumentParser } from "./types";

type DoclingResponse = {
  status?: string;
  errors?: Array<{ message?: string } | string>;
  document?: {
    md_content?: string;
    text_content?: string;
  };
};

export class DoclingParser implements DocumentParser {
  async parse({ filePath, mimeType, fileName }: Parameters<DocumentParser["parse"]>[0]) {
    const serviceUrl = (
      process.env.DOCLING_SERVICE_URL || "http://localhost:5001"
    ).replace(/\/$/, "");

    const form = new FormData();
    const bytes = await fs.readFile(filePath);
    form.append("files", new Blob([bytes], { type: mimeType }), fileName);
    form.append("to_formats", "md");

    const headers: HeadersInit = {};
    if (process.env.DOCLING_API_KEY) {
      headers["X-Api-Key"] = process.env.DOCLING_API_KEY;
    }

    let response: Response;
    try {
      response = await fetch(`${serviceUrl}/v1/convert/file`, {
        method: "POST",
        headers,
        body: form
      });
    } catch (error) {
      throw new Error(
        `Could not reach the Docling service: ${error instanceof Error ? error.message : "connection failed"}`
      );
    }

    const raw = await response.text();
    let result: DoclingResponse;
    try {
      result = JSON.parse(raw) as DoclingResponse;
    } catch {
      throw new Error(`Docling returned an unreadable response (${response.status}).`);
    }

    if (!response.ok || result.status === "failure") {
      const details = result.errors
        ?.map((error) => (typeof error === "string" ? error : error.message))
        .filter(Boolean)
        .join("; ");
      throw new Error(details || `Docling conversion failed (${response.status}).`);
    }

    const text = result.document?.md_content || result.document?.text_content || "";
    if (!text) throw new Error("Docling completed without returning document text.");
    return normalizeText(text);
  }
}
