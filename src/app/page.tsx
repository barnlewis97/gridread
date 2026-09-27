import Analyser from "@/components/Analyser";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-6 shadow-lg sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-teal-400 sm:text-3xl">
            GridRead
          </h1>
          <p className="mt-2 text-zinc-300">
            Paste a power purchase agreement or upload the PDF to extract key terms and flag
            risks for the corporate buyer against market standard.
          </p>
        </header>
        <Analyser />
        <footer className="mt-10 border-t border-zinc-700 pt-4 text-xs text-zinc-400">
          AI-generated analysis for information only — not legal advice. Results can vary slightly
          between runs, such as wording or the severity of minor flags, but the overall assessment
          should be consistent.
        </footer>
      </div>
    </main>
  );
}
