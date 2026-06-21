import { describe, it, expect } from 'vitest';
import { toTSV, toCSV } from '../../src/core/export.js';

const cols = [{ name: 'a' }, { name: 'b' }];

describe('toTSV', () => {
  it('header + rows, null → empty cell', () => {
    expect(toTSV(cols, [[1, 'x'], [2, null]])).toBe('a\tb\n1\tx\n2\t');
  });
  it('escapes backslash, tab, newline, CR ClickHouse-style', () => {
    expect(toTSV([{ name: 'c' }], [['x\ty\nz\\w\r']])).toBe('c\nx\\ty\\nz\\\\w\\r');
  });
  it('header only when there are no rows', () => {
    expect(toTSV(cols, [])).toBe('a\tb');
  });
});

describe('toCSV', () => {
  it('header + rows, null → empty cell, no quoting when not needed', () => {
    expect(toCSV(cols, [[1, 'x'], [2, null]])).toBe('a,b\n1,x\n2,');
  });
  it('quotes fields with comma, quote, or newline; doubles internal quotes', () => {
    expect(toCSV([{ name: 'h,1' }], [['a"b'], ['c\nd']]))
      .toBe('"h,1"\n"a""b"\n"c\nd"');
  });
  it('header only when there are no rows', () => {
    expect(toCSV(cols, [])).toBe('a,b');
  });
});
