# GridRead

A Next.js app for corporate energy buyers to review power purchase agreements (PPAs) for risk. Paste the agreement text or upload a PDF, and Claude — acting as an energy lawyer advising the buyer — returns:

- an extracted terms table (parties, facility, technology, contract term, ACQ, strike price, indexation, settlement basis, balancing, curtailment, break fee, governing law)
- colour-coded risk flags (high / medium / low) measured against market standard
- a short summary with an overall risk rating

Results can be exported to PDF with a choice of sections and terms.

AI-generated analysis for information only — not legal advice. Results can vary slightly between runs.

## Running locally

```bash
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Deploying

Deploy to Vercel and set `ANTHROPIC_API_KEY` under Project Settings → Environment Variables. The analysis route allows up to 300 seconds, as a full review can take a couple of minutes.

## Model comparison script

`scripts/compare-models.ts` runs a folder of PDFs through several Claude models and reports latency, tokens and cost. It makes live, billed API calls:

```bash
node --env-file=.env.local scripts/compare-models.ts <pdf-dir> <out-dir>
```
