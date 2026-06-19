// Pure result-table sorting. Numeric when both cells parse as numbers,
// lexicographic otherwise. Returns a new array; never mutates the input.

/** True when `v` is a string that is wholly a number literal. */
function looksNumeric(v) {
  return !Number.isNaN(parseFloat(v)) && /^[\-0-9.eE+]+$/.test(String(v));
}

/**
 * Sort `rows` by column index `col` in direction `dir` ('asc' | 'desc').
 * When `col` is null the input is returned unchanged (a copy is not made).
 */
export function sortRows(rows, col, dir = 'asc') {
  if (col == null) return rows;
  const sorted = [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    const both = looksNumeric(av) && looksNumeric(bv);
    const cmp = both
      ? parseFloat(av) - parseFloat(bv)
      : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}
