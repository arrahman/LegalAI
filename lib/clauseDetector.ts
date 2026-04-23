import { retrieveRelevantChunks, toCitation } from "./retrieval";
import { trimSnippet } from "./text";
import { ClauseCategory, ClauseFinding, LegalDocument } from "./types";

const clauseQueries: Record<ClauseCategory, { title: string; query: string; riskHints: string[] }> = {
  confidentiality: {
    title: "Confidentiality",
    query: "confidential information non-disclosure permitted disclosures exclusions confidentiality obligations",
    riskHints: ["perpetual", "all information", "without limitation"]
  },
  payment_terms: {
    title: "Payment terms",
    query: "payment fees invoices late payment taxes expenses payment schedule",
    riskHints: ["late fee", "non-refundable", "advance payment"]
  },
  termination: {
    title: "Termination",
    query: "termination for cause convenience notice cure period breach effect of termination",
    riskHints: ["immediately", "sole discretion", "without notice"]
  },
  liability: {
    title: "Limitation of liability",
    query: "limitation of liability damages cap consequential incidental indirect damages",
    riskHints: ["uncapped", "consequential damages", "no liability"]
  },
  indemnity: {
    title: "Indemnity",
    query: "indemnify defend hold harmless claims losses damages third party",
    riskHints: ["sole", "all claims", "first party"]
  },
  dispute_resolution: {
    title: "Dispute resolution",
    query: "arbitration mediation dispute resolution venue courts jurisdiction",
    riskHints: ["binding arbitration", "waive jury", "class action waiver"]
  },
  governing_law: {
    title: "Governing law",
    query: "governing law laws of state jurisdiction venue",
    riskHints: ["foreign", "exclusive jurisdiction"]
  },
  renewal: {
    title: "Renewal",
    query: "renewal auto renew automatic renewal successive terms notice non-renewal",
    riskHints: ["automatic renewal", "auto-renew", "unless notice"]
  },
  intellectual_property: {
    title: "Intellectual property",
    query: "intellectual property ownership license work product inventions feedback",
    riskHints: ["assignment", "irrevocable", "royalty-free"]
  }
};

export async function extractClauses(document: LegalDocument): Promise<ClauseFinding[]> {
  const findings = await Promise.all(
    Object.entries(clauseQueries).map(async ([category, config]) => {
      const [match] = await retrieveRelevantChunks(document, config.query, 1);
      const score = match?.score || 0;
      const text = match?.chunk.text || "";
      const normalized = text.toLowerCase();
      const hasHint = config.query
        .split(" ")
        .some((term) => term.length > 4 && normalized.includes(term.toLowerCase()));
      const present = Boolean(match && (score > 0.12 || hasHint));
      const riskHint = config.riskHints.find((hint) => normalized.includes(hint));

      return {
        category: category as ClauseCategory,
        title: config.title,
        present,
        confidence: present ? Math.min(0.95, Math.max(0.55, score)) : 0.35,
        excerpt: present ? trimSnippet(text, 500) : undefined,
        citation: present && match ? toCitation(document, match.chunk, score) : undefined,
        risk: riskHint ? "medium" : present ? "low" : "high",
        note: riskHint
          ? `Potential review item: contains "${riskHint}".`
          : present
            ? "Clause appears present. Review exact obligations before relying on it."
            : "Clause was not confidently detected."
      } satisfies ClauseFinding;
    })
  );

  return findings;
}

export async function compareDocuments(base: LegalDocument, candidate: LegalDocument) {
  const [baseClauses, candidateClauses] = await Promise.all([
    extractClauses(base),
    extractClauses(candidate)
  ]);

  return baseClauses.map((baseClause) => {
    const candidateClause = candidateClauses.find(
      (clause) => clause.category === baseClause.category
    );

    return {
      category: baseClause.category,
      title: baseClause.title,
      basePresent: baseClause.present,
      candidatePresent: Boolean(candidateClause?.present),
      status:
        baseClause.present && !candidateClause?.present
          ? "missing_in_uploaded"
          : !baseClause.present && candidateClause?.present
            ? "new_in_uploaded"
            : "needs_review",
      baseExcerpt: baseClause.excerpt,
      candidateExcerpt: candidateClause?.excerpt,
      note:
        baseClause.present && !candidateClause?.present
          ? "The uploaded contract appears to omit a clause found in the standard document."
          : "Compare excerpts for wording, caps, deadlines, notice periods, and exceptions."
    };
  });
}
