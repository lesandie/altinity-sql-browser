// Pure helpers for the bar-chart result view: pick X/Y columns and derive the
// plotted series. Kept out of the DOM renderer so the axis logic is testable.

import { isNumericType } from './format.js';

/**
 * Choose which columns to plot. Prefer the first non-numeric column as X
 * (categorical label) and the first numeric column as Y. When every column is
 * numeric (e.g. `year, flights`), fall back to col 0 = X, col 1 = Y; with a
 * single column, plot it against itself.
 *
 * Returns { xIdx, yIdx, ok } where ok=false means there is no numeric Y.
 */
export function pickChartAxes(columns) {
  if (!columns || columns.length === 0) return { xIdx: 0, yIdx: 0, ok: false };
  let xIdx = columns.findIndex((c) => !isNumericType(c.type));
  let yIdx = columns.findIndex((c, i) => i !== xIdx && isNumericType(c.type));
  if (xIdx === -1) {
    xIdx = 0;
    yIdx = columns.length > 1 ? 1 : 0;
  }
  if (yIdx === -1) yIdx = xIdx;
  const ok = isNumericType(columns[yIdx].type);
  return { xIdx, yIdx, ok };
}

/**
 * Build the chart series from rows. Caps at `limit` rows. Returns
 * { labels, values, max } with numeric values coerced via Number()||0.
 */
export function chartSeries(rows, xIdx, yIdx, limit = 200) {
  const slice = rows.slice(0, limit);
  const values = slice.map((row) => Number(row[yIdx]) || 0);
  const labels = slice.map((row) => String(row[xIdx]));
  const max = Math.max(...values, 0);
  return { labels, values, max };
}
