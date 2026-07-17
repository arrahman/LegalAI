import { NextResponse } from "next/server";
import { z } from "zod";
import { createDocument, saveUpload } from "@/lib/documentStore";
import { createDocumentParser, documentParserIds } from "@/lib/documentParsers";

const schema = z.object({
  documentType: z.enum([
    "nda",
    "service_agreement",
    "employment_contract",
    "vendor_agreement",
    "lease_agreement",
    "other"
  ]),
  parser: z.enum(documentParserIds).default("extract_text")
});

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const parsed = schema.parse({
      documentType: form.get("documentType") || "other",
      parser: form.get("parser") || "extract_text"
    });

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a file." }, { status: 400 });
    }

    const saved = await saveUpload(file);
    const parser = createDocumentParser(parsed.parser);
    const text = await parser.parse({
      filePath: saved.filePath,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name
    });

    if (text.length < 50) {
      return NextResponse.json(
        { error: "Very little text was extracted. This may be a scanned PDF that needs OCR." },
        { status: 422 }
      );
    }

    const document = await createDocument({
      originalName: file.name,
      fileName: saved.fileName,
      mimeType: file.type || "application/octet-stream",
      documentType: parsed.documentType,
      text
    });

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
