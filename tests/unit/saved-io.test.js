import { describe, it, expect } from 'vitest';
import { buildExportDoc, parseImportDoc, mergeSaved } from '../../src/core/saved-io.js';

describe('buildExportDoc', () => {
  it('wraps queries in the envelope, keeps only id/name/sql/favorite, coerces favorite', () => {
    const doc = buildExportDoc([{ id: 's1', name: 'A', sql: 'SELECT 1', favorite: 1, extra: 'x' }], '2026-06-21T00:00:00.000Z');
    expect(doc).toEqual({
      format: 'altinity-sql-browser/saved-queries',
      version: 1,
      exportedAt: '2026-06-21T00:00:00.000Z',
      queries: [{ id: 's1', name: 'A', sql: 'SELECT 1', favorite: true }],
    });
  });
  it('handles an empty list', () => {
    expect(buildExportDoc([], 'T').queries).toEqual([]);
  });
});

describe('parseImportDoc', () => {
  const env = (over) => JSON.stringify({ format: 'altinity-sql-browser/saved-queries', version: 1, queries: [], ...over });
  it('parses a valid doc and normalizes entries (drops invalid ones)', () => {
    const { queries } = parseImportDoc(env({ queries: [
      { id: 's1', name: 'A', sql: 'SELECT 1', favorite: 1 },
      { name: 'B', sql: 'SELECT 2' },        // no id → id undefined
      { name: 'bad', sql: 5 },               // non-string sql → dropped
      { sql: 'no name' },                    // no name → dropped
    ] }));
    expect(queries).toEqual([
      { id: 's1', name: 'A', sql: 'SELECT 1', favorite: true },
      { id: undefined, name: 'B', sql: 'SELECT 2', favorite: false },
    ]);
  });
  it('throws a user message for each invalid envelope', () => {
    expect(() => parseImportDoc('{not json')).toThrow('Not a valid JSON file');
    expect(() => parseImportDoc(JSON.stringify({ format: 'other' }))).toThrow('Unrecognized file format');
    expect(() => parseImportDoc(env({ version: 2 }))).toThrow('Unsupported file version');
    expect(() => parseImportDoc(env({ version: 'x' }))).toThrow('Unsupported file version');
    expect(() => parseImportDoc(env({ queries: 'nope' }))).toThrow('No queries in file');
    expect(() => parseImportDoc(env({ queries: Array.from({ length: 1001 }, () => ({ name: 'n', sql: 's' })) }))).toThrow('Too many queries');
    expect(() => parseImportDoc('null')).toThrow('Unrecognized file format'); // doc falsy
  });
});

describe('mergeSaved', () => {
  const gen = (() => { let n = 0; return () => 'gen' + (++n); });
  it('adds new, skips content dup, updates by id, generates id when missing', () => {
    const existing = [{ id: 's1', name: 'A', sql: '1', favorite: false }];
    const incoming = [
      { id: 's1', name: 'A', sql: '1', favorite: false }, // identical → skip (content)
      { id: 's1', name: 'A2', sql: '1b', favorite: true }, // same id, differs → update
      { name: 'B', sql: '2', favorite: false },            // no id → genId, add
      { id: 's2', name: 'C', sql: '3', favorite: false },  // new id → add (keeps id)
    ];
    const r = mergeSaved(existing, incoming, gen());
    expect(r).toMatchObject({ skipped: 1, updated: 1, added: 2 });
    expect(r.merged.find((q) => q.id === 's1')).toMatchObject({ name: 'A2', sql: '1b', favorite: true });
    expect(r.merged.find((q) => q.name === 'B').id).toBe('gen1'); // genId for the id-less entry
    expect(r.merged.find((q) => q.name === 'C').id).toBe('s2');   // given id kept
    expect(r.merged.map((q) => q.name)).toEqual(['A2', 'B', 'C']);
    expect(existing[0]).toEqual({ id: 's1', name: 'A', sql: '1', favorite: false }); // not mutated
  });
});
