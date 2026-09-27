export function defaultFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `GridReadReview_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Strips characters that are invalid in file names; blank input falls back to the dated default.
export function resolveFileName(input: string): string {
  const name = input.trim().replace(/[\/:*?"<>|]+/g, "").replace(/\.pdf$/i, "").trim();
  return `${name || defaultFileName()}.pdf`;
}
