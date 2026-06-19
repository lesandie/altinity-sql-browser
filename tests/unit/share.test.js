import { describe, it, expect } from 'vitest';
import { encodeSqlForHash, decodeSqlFromHash } from '../../src/core/share.js';

describe('share encode/decode', () => {
  it('round-trips ASCII SQL', () => {
    const sql = 'SELECT * FROM t WHERE x = 1';
    expect(decodeSqlFromHash('#' + encodeSqlForHash(sql))).toBe(sql);
  });
  it('round-trips unicode', () => {
    const sql = 'SELECT \'café — 日本語\'';
    expect(decodeSqlFromHash(encodeSqlForHash(sql))).toBe(sql);
  });
  it('tolerates a leading # or none', () => {
    const enc = encodeSqlForHash('SELECT 1');
    expect(decodeSqlFromHash(enc)).toBe('SELECT 1');
    expect(decodeSqlFromHash('#' + enc)).toBe('SELECT 1');
  });
  it('returns empty for empty/short/garbage hashes', () => {
    expect(decodeSqlFromHash('')).toBe('');
    expect(decodeSqlFromHash('#')).toBe('');
    expect(decodeSqlFromHash(null)).toBe('');
    expect(decodeSqlFromHash('#@@@@')).toBe('');
  });
});
