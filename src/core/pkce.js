// PKCE (RFC 7636) + OAuth state generation. Uses Web Crypto, which is
// injectable so tests run under Node's webcrypto or a stub.

function base64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a PKCE { verifier, challenge } pair. `cryptoObj` defaults to the
 * global Web Crypto; pass a stub in tests.
 */
export async function generatePKCE(cryptoObj = globalThis.crypto) {
  const bytes = cryptoObj.getRandomValues(new Uint8Array(32));
  const verifier = base64url(bytes);
  const digest = await cryptoObj.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  const challenge = base64url(new Uint8Array(digest));
  return { verifier, challenge };
}

/** Generate a random hex CSRF state string (16 bytes → 32 hex chars). */
export function randomState(cryptoObj = globalThis.crypto) {
  return cryptoObj
    .getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
}
