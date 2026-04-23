import { NextResponse } from "next/server";
import { z } from "zod";
import { getDocument } from "@/lib/documentStore";
import { compareDocuments } from "@/lib/clauseDetector";

const schema = z.object({
  baseDocumentId: z.string().min(1),
  candidateDocumentId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Two documents are required." }, { status: 400 });
    }

    const [base, candidate] = await Promise.all([
      getDocument(parsed.data.baseDocumentId),
      getDocument(parsed.data.candidateDocumentId)
    ]);

    if (!base || !candidate) {
      return NextResponse.json({ error: "One or both documents were not found." }, { status: 404 });
    }

    const comparison = await compareDocuments(base, candidate);
    return NextResponse.json({ comparison });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Comparison failed." },
      { status: 500 }
    );
  }
}
