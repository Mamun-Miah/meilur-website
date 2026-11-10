/**
 * CSV helpers. Every cell is quoted, and any value a spreadsheet would
 * evaluate as a formula is prefixed with an apostrophe (OWASP CSV injection).
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 (Bangla names, punctuation) correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
