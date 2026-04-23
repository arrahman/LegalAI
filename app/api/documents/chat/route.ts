import { NextResponse } from "next/server";
import { z } from "zod";
import { getDocument } from "@/lib/documentStore";
import { answerQuestion } from "@/lib/rag";

const schema = z.object({
  documentId: z.string().min(1),
  question: z.string().min(3)
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Document and question are required." }, { status: 400 });
    }

    const document = await getDocument(parsed.data.documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const result = await answerQuestion(document, parsed.data.question);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Question failed." },
      { status: 500 }
    );
  }
}
