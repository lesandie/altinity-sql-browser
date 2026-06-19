// Encode/decode a SQL string to/from a URL hash fragment, so a query can be
// shared by link. UTF-8 safe (handles non-Latin1 via encodeURIComponent).

/** Encode SQL to a base64 string suitable for a URL hash. */
export function encodeSqlForHash(sql) {
  return btoa(unescape(encodeURIComponent(sql)));
}

/** Decode a URL hash (with or without a leading '#') back to SQL. '' on error. */
export function decodeSqlFromHash(hash) {
  if (!hash || hash.length < 2) return '';
  try {
    return decodeURIComponent(escape(atob(hash.replace(/^#/, ''))));
  } catch {
    return '';
  }
}
