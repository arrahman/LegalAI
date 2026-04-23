import { NextResponse } from "next/server";
import { z } from "zod";
import { getDocument } from "@/lib/documentStore";
import { extractClauses } from "@/lib/clauseDetector";

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

    const clauses = await extractClauses(document);
    return NextResponse.json({ clauses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Clause extraction failed." },
      { status: 500 }
    );
  }
}
