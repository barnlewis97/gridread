// Runs every example PPA through each candidate model with the app's prompt and
// schema, recording latency, token usage and cost. Makes live, billed API calls.
// Usage: node --env-file=.env.local scripts/compare-models.ts <pdf-dir> <out-dir>
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AnalysisSchema } from "../src/lib/schema.ts";
import { SYSTEM_PROMPT } from "../src/lib/prompt.ts";

// USD per million tokens (input, output).
const MODELS = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5": { input: 2, output: 10 },
} as const;

const [pdfDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const pdfs = readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
const client = new Anthropic();

async function run(model: keyof typeof MODELS, pdf: string) {
  const data = readFileSync(join(pdfDir, pdf)).toString("base64");
  const start = Date.now();
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: betaZodOutputFormat(AnalysisSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: pdf },
            { type: "text", text: "Review this PPA for risk to the corporate buyer." },
          ],
        },
      ],
    });
    const seconds = (Date.now() - start) / 1000;
    const { input_tokens, output_tokens } = response.usage;
    const price = MODELS[model];
    const cost = (input_tokens * price.input + output_tokens * price.output) / 1e6;
    const record = { model, pdf, seconds, input_tokens, output_tokens, cost, stop_reason: response.stop_reason, analysis: response.parsed_output };
    writeFileSync(join(outDir, `${model}__${pdf}.json`), JSON.stringify(record, null, 2));
    return record;
  } catch (err) {
    return { model, pdf, seconds: (Date.now() - start) / 1000, error: String(err) };
  }
}

const jobs = (Object.keys(MODELS) as (keyof typeof MODELS)[]).flatMap((m) => pdfs.map((p) => run(m, p)));
const results = await Promise.all(jobs);

for (const r of results) {
  if ("error" in r) {
    console.log(`${r.model}\t${r.pdf}\tERROR ${r.error}`);
  } else {
    const flags = r.analysis?.risk_flags ?? [];
    const n = (s: string) => flags.filter((f) => f.severity === s).length;
    console.log(
      `${r.model}\t${r.pdf}\t${r.seconds.toFixed(0)}s\tin=${r.input_tokens}\tout=${r.output_tokens}\t$${r.cost.toFixed(3)}\t${r.stop_reason}\tflags H${n("high")}/M${n("medium")}/L${n("low")}\toverall=${r.analysis?.overall_risk}`,
    );
  }
}
