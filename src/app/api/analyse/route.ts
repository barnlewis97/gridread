import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { extractText, getDocumentProxy } from "unpdf";
import { AnalysisSchema } from "@/lib/schema";
import { SYSTEM_PROMPT } from "@/lib/prompt";

// A full PPA review with adaptive thinking can take a couple of minutes.
export const maxDuration = 300;

// Vercel caps function request bodies at 4.5 MB.
const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 400_000;

// Below this average, a PDF is treated as scanned and sent as-is.
const MIN_TEXT_CHARS_PER_PAGE = 200;

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function extractPdfText(bytes: Buffer): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const trimmed = text.trim();
    return trimmed.length >= totalPages * MIN_TEXT_CHARS_PER_PAGE ? trimmed : null;
  } catch (err) {
    console.warn("PDF text extraction failed; sending the PDF instead.", err);
    return null;
  }
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Invalid request.", 400);
  }

  // Each visitor supplies their own key, used for this request only and never stored or logged.
  // A blank key must stop here: the SDK would otherwise fall back to ANTHROPIC_API_KEY in the env.
  const apiKey = form.get("apiKey");
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return error("Enter your Anthropic API key.", 401);
  }

  const file = form.get("file");
  const text = form.get("text");

  let document: Anthropic.Beta.BetaContentBlockParam;
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return error("Only PDF files are supported.", 400);
    }
    if (file.size > MAX_PDF_BYTES) {
      return error("PDF is larger than the 4 MB limit.", 413);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    // Claude bills a PDF as its text plus an image of every page, roughly 2.5x the tokens of the
    // text alone, so send the extracted text when there is enough of it. Scanned PDFs have
    // little or no text layer and still go as a PDF.
    const extracted = await extractPdfText(bytes);
    document = extracted
      ? {
          type: "document",
          source: { type: "text", media_type: "text/plain", data: extracted },
          title: file.name,
        }
      : {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") },
          title: file.name,
        };
  } else if (typeof text === "string" && text.trim()) {
    if (text.length > MAX_TEXT_CHARS) {
      return error("Pasted text is too long.", 413);
    }
    document = {
      type: "document",
      source: { type: "text", media_type: "text/plain", data: text },
      title: "Pasted PPA text",
    };
  } else {
    return error("Paste the PPA text or upload a PDF.", 400);
  }

  try {
    const client = new Anthropic({ apiKey: apiKey.trim() });
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      // Opus 5.5 defaults to medium effort; high performed best in testing.
      output_config: { effort: "high", format: betaZodOutputFormat(AnalysisSchema) },
      // If the primary model declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            document,
            { type: "text", text: "Review this PPA for risk to the corporate buyer." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return error("The model declined to analyse this document.", 422);
    }
    if (response.stop_reason === "max_tokens") {
      return error("The analysis was cut off before it finished. Try a shorter document.", 502);
    }
    if (!response.parsed_output) {
      return error("Could not parse the analysis. Please try again.", 502);
    }
    return Response.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return error("That Anthropic API key is invalid or has expired.", 401);
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return error("That Anthropic API key does not have access to this model.", 403);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return error("Rate limited by the Anthropic API. Please wait and try again.", 429);
    }
    if (err instanceof Anthropic.BadRequestError) {
      return error(`The request was rejected: ${err.message}`, 400);
    }
    if (err instanceof Anthropic.APIError) {
      return error("The Anthropic API returned an error. Please try again.", 502);
    }
    console.error(err);
    return error("Unexpected server error.", 500);
  }
}
