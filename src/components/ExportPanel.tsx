"use client";

import { useEffect, useRef, useState } from "react";
import { TERM_LABELS, type Analysis, type TermKey } from "@/lib/schema";
import { defaultFileName } from "@/lib/fileName";

const ALL_TERMS = Object.keys(TERM_LABELS) as TermKey[];

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-600 bg-zinc-900 accent-teal-500";

export default function ExportPanel({ analysis, source }: { analysis: Analysis; source: string }) {
  const [terms, setTerms] = useState<TermKey[]>(ALL_TERMS);
  const [riskFlags, setRiskFlags] = useState(true);
  const [summary, setSummary] = useState(true);
  const [fileName, setFileName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const termsBoxRef = useRef<HTMLInputElement>(null);

  const allTerms = terms.length === ALL_TERMS.length;
  const someTerms = terms.length > 0 && !allTerms;

  useEffect(() => {
    if (termsBoxRef.current) termsBoxRef.current.indeterminate = someTerms;
  }, [someTerms]);

  function toggleTerm(key: TermKey) {
    setTerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : ALL_TERMS.filter((k) => k === key || prev.includes(k)),
    );
  }

  async function exportPdf() {
    setExporting(true);
    setError(null);
    try {
      const { exportAnalysisPdf } = await import("@/lib/exportPdf");
      exportAnalysisPdf(analysis, source, { terms, riskFlags, summary, fileName });
    } catch (err) {
      console.error(err);
      setError("Could not create the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const nothingSelected = terms.length === 0 && !riskFlags && !summary;

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-white">Export to PDF</h2>
      <p className="mt-1 text-sm text-zinc-400">Choose what to include in the report.</p>

      <div className="mt-4 space-y-3 text-sm text-zinc-200">
        <div>
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <input
              ref={termsBoxRef}
              type="checkbox"
              checked={allTerms}
              onChange={() => setTerms(allTerms ? [] : ALL_TERMS)}
              className={checkboxClass}
            />
            Extracted terms
          </label>
          <div className="mt-2 grid gap-x-4 gap-y-1.5 pl-6 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_TERMS.map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={terms.includes(key)}
                  onChange={() => toggleTerm(key)}
                  className={checkboxClass}
                />
                {TERM_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={riskFlags}
            onChange={(e) => setRiskFlags(e.target.checked)}
            className={checkboxClass}
          />
          Risk flags
        </label>
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={summary}
            onChange={(e) => setSummary(e.target.checked)}
            className={checkboxClass}
          />
          Summary
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm text-zinc-300">
          File name
          <div className="mt-1 flex items-center rounded-lg border border-teal-500/60 bg-zinc-800 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/20">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={defaultFileName()}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none"
            />
            <span className="pr-3 text-sm text-zinc-500">.pdf</span>
          </div>
        </label>
        <button
          type="button"
          onClick={exportPdf}
          disabled={nothingSelected || exporting}
          className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {exporting ? "Exporting…" : "Export PDF"}
        </button>
      </div>
      {nothingSelected && (
        <p className="mt-2 text-xs text-zinc-400">Select at least one item to export.</p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </section>
  );
}
