import { NextResponse } from "next/server";
import { z } from "zod";
import { getDocument, updateDocument } from "@/lib/documentStore";
import { summarizeDocument } from "@/lib/rag";

const schema = z.object({ documentId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Document is required." }, { status: 400 });
    }

    const document = await getDocument(parsed.data.documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const result = await summarizeDocument(document);
    document.summary = result.summary;
    await updateDocument(document);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary failed." },
      { status: 500 }
    );
  }
}
