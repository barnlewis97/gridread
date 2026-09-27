import ExportPanel from "./ExportPanel";
import { REFERENCE_NOTE, TERM_LABELS, type Analysis, type Severity, type TermKey } from "@/lib/schema";

const SEVERITY_STYLES: Record<Severity, { card: string; badge: string; label: string }> = {
  high: {
    card: "border-red-500/40 bg-red-500/10 border-l-red-500",
    badge: "bg-red-600 text-white",
    label: "High",
  },
  medium: {
    card: "border-amber-500/40 bg-amber-500/10 border-l-amber-400",
    badge: "bg-amber-500 text-white",
    label: "Medium",
  },
  low: {
    card: "border-green-500/40 bg-green-500/10 border-l-green-500",
    badge: "bg-green-600 text-white",
    label: "Low",
  },
};

const ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export default function Results({ analysis, source }: { analysis: Analysis; source: string }) {
  const flags = [...analysis.risk_flags].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of flags) counts[f.severity]++;
  const overall = SEVERITY_STYLES[analysis.overall_risk];

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-white">Extracted terms</h2>
        <p className="mb-3 mt-1 text-xs text-zinc-400">{REFERENCE_NOTE}</p>
        <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/60 text-xs uppercase tracking-wide text-teal-400">
              <tr>
                <th className="w-1/3 px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(Object.keys(TERM_LABELS) as TermKey[]).map((key) => (
                <tr key={key} className="align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-zinc-300">
                    {TERM_LABELS[key]}
                  </th>
                  <td className="whitespace-pre-line px-4 py-3 text-white">
                    {analysis.terms[key]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Risk flags</h2>
          <span className="text-sm text-zinc-400">
            {counts.high} high · {counts.medium} medium · {counts.low} low
          </span>
        </div>
        <p className="mb-3 mt-1 text-xs text-zinc-400">{REFERENCE_NOTE}</p>
        {flags.length === 0 ? (
          <p className="text-sm text-zinc-400">No risk flags identified.</p>
        ) : (
          <ul className="space-y-3">
            {flags.map((flag, i) => {
              const s = SEVERITY_STYLES[flag.severity];
              return (
                <li key={i} className={`rounded-lg border border-l-4 p-4 ${s.card}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${s.badge}`}>
                      {s.label}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      {flag.term}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white">{flag.title}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{flag.issue}</p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-white">Market standard</dt>
                      <dd className="text-zinc-300">{flag.market_standard}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-white">Recommendation</dt>
                      <dd className="text-zinc-300">{flag.recommendation}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Summary</h2>
          <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${overall.badge}`}>
            Overall risk: {overall.label}
          </span>
        </div>
        <p className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-100 shadow-sm">
          {analysis.summary}
        </p>
      </section>

      <ExportPanel analysis={analysis} source={source} />
    </div>
  );
}
