import { describe, it, expect } from 'vitest';
import { pickChartAxes, chartSeries } from '../../src/core/chart-data.js';

describe('pickChartAxes', () => {
  it('returns not-ok for empty columns', () => {
    expect(pickChartAxes([])).toEqual({ xIdx: 0, yIdx: 0, ok: false });
    expect(pickChartAxes(null)).toEqual({ xIdx: 0, yIdx: 0, ok: false });
  });
  it('prefers categorical X + numeric Y', () => {
    const cols = [{ type: 'String' }, { type: 'UInt64' }];
    expect(pickChartAxes(cols)).toEqual({ xIdx: 0, yIdx: 1, ok: true });
  });
  it('all-numeric falls back to col0=X, col1=Y', () => {
    const cols = [{ type: 'UInt16' }, { type: 'UInt64' }];
    expect(pickChartAxes(cols)).toEqual({ xIdx: 0, yIdx: 1, ok: true });
  });
  it('single numeric column plots against itself', () => {
    const cols = [{ type: 'UInt64' }];
    expect(pickChartAxes(cols)).toEqual({ xIdx: 0, yIdx: 0, ok: true });
  });
  it('not ok when no numeric column exists', () => {
    const cols = [{ type: 'String' }, { type: 'String' }];
    const r = pickChartAxes(cols);
    expect(r.ok).toBe(false);
  });
  it('categorical X with no numeric Y reuses X as Y and is not ok', () => {
    const cols = [{ type: 'String' }];
    expect(pickChartAxes(cols)).toEqual({ xIdx: 0, yIdx: 0, ok: false });
  });
});

describe('chartSeries', () => {
  const rows = [['a', '5'], ['b', '10'], ['c', 'x']];
  it('builds labels, numeric values and max', () => {
    expect(chartSeries(rows, 0, 1)).toEqual({
      labels: ['a', 'b', 'c'],
      values: [5, 10, 0], // 'x' coerces to 0
      max: 10,
    });
  });
  it('caps at the row limit', () => {
    const big = Array.from({ length: 500 }, (_, i) => [String(i), String(i)]);
    expect(chartSeries(big, 0, 1, 3).values).toEqual([0, 1, 2]);
  });
  it('max is at least 0 for empty rows', () => {
    expect(chartSeries([], 0, 1)).toEqual({ labels: [], values: [], max: 0 });
  });
});
