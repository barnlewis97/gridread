import { z } from "zod";

// Keys double as the row order of the extracted terms table.
export const TERM_LABELS = {
  parties: "Parties",
  facility: "Facility",
  technology: "Technology",
  contract_term: "Contract term",
  annual_contract_quantity: "Annual contract quantity",
  strike_price: "Strike price",
  indexation: "Indexation",
  settlement_basis: "Settlement basis",
  balancing_responsibility: "Balancing responsibility",
  curtailment_treatment: "Curtailment treatment",
  break_fee: "Break fee",
  governing_law: "Governing law",
} as const;

export const REFERENCE_NOTE =
  "References in brackets, such as (Clause 5.1) or (Section 4), point to the numbered clauses and sections of the source document, so each point can be checked against the original.";

export type TermKey = keyof typeof TERM_LABELS;

const termValue = z
  .string()
  .describe(
    'One sentence stating only what the document says, ending with the clause or section reference in brackets. Exactly "Not Specified" if the document is silent.',
  );

export const AnalysisSchema = z.object({
  terms: z.object({
    parties: termValue,
    facility: termValue,
    technology: termValue,
    contract_term: termValue,
    annual_contract_quantity: termValue,
    strike_price: termValue,
    indexation: termValue,
    settlement_basis: termValue,
    balancing_responsibility: termValue,
    curtailment_treatment: termValue,
    break_fee: termValue,
    governing_law: termValue,
  }),
  risk_flags: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      term: z.string().describe("The term the flag relates to, with the clause or section reference in brackets"),
      title: z.string().describe("Short headline for the issue"),
      issue: z
        .string()
        .describe("2-3 sentences: what the clause does and why it matters to the buyer, with clause or section references in brackets"),
      market_standard: z
        .string()
        .describe("1 sentence: what a market-standard corporate PPA provides"),
      recommendation: z
        .string()
        .describe("1 sentence: what the buyer should negotiate and the risk of leaving it unchanged"),
    }),
  ),
  overall_risk: z.enum(["high", "medium", "low"]),
  summary: z
    .string()
    .describe("Executive summary of the buyer's risk position in no more than 3 sentences"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Severity = Analysis["risk_flags"][number]["severity"];
