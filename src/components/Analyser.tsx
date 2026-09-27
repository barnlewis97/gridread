"use client";

import { useRef, useState } from "react";
import type { Analysis } from "@/lib/schema";
import Results from "./Results";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export default function Analyser() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ analysis: Analysis; source: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(f: File | undefined) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setError("PDF must be 4 MB or smaller.");
      return;
    }
    setError(null);
    setText("");
    setFile(f);
  }

  function removeFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyse() {
    setLoading(true);
    setError(null);
    setResult(null);
    const body = new FormData();
    if (file) body.append("file", file);
    else body.append("text", text);

    try {
      const res = await fetch("/api/analyse", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Request failed (${res.status}).`);
      } else {
        setResult({ analysis: data as Analysis, source: file ? file.name : "Pasted text" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canAnalyse = !loading && (file !== null || text.trim().length > 0);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="relative">
          <label htmlFor="ppa-text" className="sr-only">
            PPA text
          </label>
          <textarea
            id="ppa-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={file !== null || loading}
            placeholder={
              file
                ? "Text input is disabled while a PDF is selected."
                : "Paste the PPA or term sheet text here…"
            }
            className="h-80 w-full resize-y rounded-lg border border-teal-500/60 bg-zinc-900 p-4 pr-28 font-sans text-sm leading-relaxed text-white placeholder:text-zinc-500 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/50 disabled:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setText("")}
            disabled={!text || file !== null || loading}
            className="absolute right-3 top-3 rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-teal-400 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear text
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
          <span className="h-px flex-1 bg-zinc-700" />
          or
          <span className="h-px flex-1 bg-zinc-700" />
        </div>

        {file ? (
          <div className="flex items-center justify-between rounded-lg border border-teal-500/60 bg-teal-500/10 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(0)} KB · PDF</p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              disabled={loading}
              className="ml-4 shrink-0 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:border-teal-400 hover:text-teal-300 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              selectFile(e.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging ? "border-teal-400 bg-teal-500/10" : "border-teal-500/60 bg-zinc-900"
            }`}
          >
            <p className="text-sm text-zinc-300">Drag and drop a PDF here</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:border-teal-400 hover:text-teal-300"
            >
              Browse files
            </button>
            <p className="text-xs text-zinc-500">PDF up to 4 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0])}
        />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={analyse}
            disabled={!canAnalyse}
            className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {loading ? "Analysing…" : "Analyse"}
          </button>
          {loading && (
            <p className="text-sm text-zinc-400">
              Reviewing the agreement — this can take a minute or two.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {result && <Results analysis={result.analysis} source={result.source} />}
    </div>
  );
}
