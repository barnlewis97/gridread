# GridRead

A Next.js app for corporate energy buyers to review power purchase agreements (PPAs) for risk. Paste the agreement text or upload a PDF, and Claude — acting as an energy lawyer advising the buyer — returns:

- an extracted terms table (parties, facility, technology, contract term, ACQ, strike price, indexation, settlement basis, balancing, curtailment, break fee, governing law)
- colour-coded risk flags (high / medium / low) measured against market standard
- a short summary with an overall risk rating

Results can be exported to PDF with a choice of sections and terms.

Visitors use their own [Anthropic API key](https://console.anthropic.com/settings/keys), entered on the page, so reviews are billed to their account rather than the host's. The key stays in browser memory, is sent to the app's own API route for each review, and is passed to Anthropic without being stored or logged.

AI-generated analysis for information only — not legal advice. Results can vary slightly between runs.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and enter your API key on the page.

## Deploying

Deploy to Vercel; no environment variables are needed. The analysis route allows up to 300 seconds, as a full review can take a couple of minutes.

## Model comparison script

`scripts/compare-models.ts` runs a folder of PDFs through several Claude models and reports latency, tokens and cost. It makes live, billed API calls, using `ANTHROPIC_API_KEY` from `.env.local` (see `.env.example`):

```bash
node --env-file=.env.local scripts/compare-models.ts <pdf-dir> <out-dir>
```
