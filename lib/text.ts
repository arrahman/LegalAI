export function normalizeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function safeId(prefix = "doc") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function trimSnippet(text: string, length = 420) {
  const compact = normalizeText(text).replace(/\n+/g, " ");
  if (compact.length <= length) return compact;
  return `${compact.slice(0, length - 1).trim()}...`;
}

export function tokenize(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}
