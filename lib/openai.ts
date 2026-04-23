import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return undefined;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function chatModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-5-mini";
}

export function embeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}

export async function embedTexts(texts: string[]) {
  const openai = getOpenAIClient();
  if (!openai) return undefined;

  const response = await openai.embeddings.create({
    model: embeddingModel(),
    input: texts
  });

  return response.data.map((item) => item.embedding);
}
