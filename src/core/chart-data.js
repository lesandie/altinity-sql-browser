// Pure helpers for the chart result view. Everything here is DOM-free and
// library-agnostic up to the final `chartJsConfig`, which assembles a plain
// Chart.js config *object* (no canvas, no globals) — so the whole role/axis/
// pivot/scale layer is unit-testable at 100% and the DOM glue in
// `ui/results.js` stays a thin wrapper around `new Chart(canvas, config)`.

import { isNumericType } from './format.js';

const TIME_RE = /^(Date|DateTime)/;
// Numeric columns whose *name* reads like a calendar bucket (year, month, …)
// are ordinal, not free measures — a `GROUP BY toYear(...)` is an X axis.
const ORDINAL_RE = /^(year|quarter|month|week|day|dayofweek|dow|hour|minute)/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

// Plots past this get unreadable, so the chart shows the first N (the table
// stays full). Exported so the renderer can surface the truncation to the user.
export const CHART_ROW_CAP = 500;

/** Strip `Nullable(...)` / `LowCardinality(...)` wrappers down to the base type. */
export function chartStripType(type) {
  let p = String(type || '');
  let m;
  while ((m = /^(?:Nullable|LowCardinality)\((.*)\)$/.exec(p))) p = m[1];
  return p;
}

/**
 * Classify a column for charting from its ClickHouse type (and, for numbers,
 * its name): 'time' | 'ordinal' | 'measure' | 'category'.
 */
export function chartRole(col) {
  const t = chartStripType(col && col.type);
  if (TIME_RE.test(t)) return 'time';
  // Wrappers already stripped, so reuse the table's numeric test on the base type.
  if (isNumericType(t)) return ORDINAL_RE.test((col && col.name) || '') ? 'ordinal' : 'measure';
  return 'category';
}

/**
 * Default chart config from column roles, or null when nothing is plottable
 * (no numeric measure). Temporal X → line, categorical X → horizontal bar,
 * ordinal X → vertical column. The config bar lets the user override the rest.
 * Returns { type, x, y:[idx], series:null }.
 */
export function autoChart(columns) {
  const cols = columns || [];
  const roles = cols.map((c, i) => ({ i, role: chartRole(c) }));
  const measures = roles.filter((r) => r.role === 'measure').map((r) => r.i);
  if (!measures.length) return null;
  // A measure exists ⇒ roles is non-empty ⇒ the `|| roles[0]` fallback always
  // resolves, so x is guaranteed defined here.
  const x = roles.find((r) => r.role === 'time')
    || roles.find((r) => r.role === 'ordinal')
    || roles.find((r) => r.role === 'category')
    || roles[0];
  const type = x.role === 'time' ? 'line' : x.role === 'category' ? 'hbar' : 'bar';
  return { type, x: x.i, y: [measures[0]], series: null };
}

/** A stable signature of the result schema; chart config is re-derived when it changes. */
export function schemaKey(columns) {
  return (columns || []).map((c) => c.name + ':' + c.type).join('|');
}

/** The chart types offered in the config bar (Bar = horizontal, Column = vertical). */
export const CHART_TYPES = [
  { value: 'hbar', label: 'Bar' },
  { value: 'bar', label: 'Column' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
];

/**
 * Derive the config-bar option lists + visibility flags for the current config.
 * Pure so the glue just maps these to <select> elements. `cfg.y` is an array of
 * column indices; `cfg.series` is an index or null.
 */
export function chartFieldOptions(columns, cfg) {
  const opt = (i) => ({ value: String(i), label: columns[i].name });
  const roleOf = (i) => chartRole(columns[i]);
  // Y is pickable from any number (measures + ordinal buckets); but the
  // "All measures" bulk toggle plots only true measures, never the X column —
  // so it can't end up charting an ordinal axis against itself.
  const numericIdx = columns.map((c, i) => i).filter((i) => roleOf(i) === 'measure' || roleOf(i) === 'ordinal');
  const catIdx = columns.map((c, i) => i).filter((i) => roleOf(i) !== 'measure');
  const allMeasures = columns.map((c, i) => i).filter((i) => roleOf(i) === 'measure' && i !== cfg.x);
  const seriesOptions = [{ value: '', label: 'None' }, ...catIdx.filter((i) => i !== cfg.x).map(opt)];
  const isPie = cfg.type === 'pie';
  return {
    typeOptions: CHART_TYPES,
    xOptions: columns.map((c, i) => opt(i)),
    yOptions: numericIdx.map(opt),
    seriesOptions,
    showSeries: !isPie && seriesOptions.length > 1,
    showMulti: !isPie && allMeasures.length > 1 && cfg.series == null,
    multiActive: (cfg.y || []).length > 1,
    allMeasures,
  };
}

/**
 * Humanize a numeric axis tick/value (M/K suffixes, 2dp). Deliberately separate
 * from format.js:formatRows — axis values can be fractional and carry one
 * decimal of suffix precision, whereas formatRows targets integer row counts.
 * Same magnitude can therefore read slightly differently on an axis vs a count.
 */
export function chartNumFmt(v) {
  if (typeof v !== 'number' || !isFinite(v)) return String(v);
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Format an X label: ISO dates collapse to YYYY-MM, everything else stringifies. */
export function chartLabel(v) {
  const sv = String(v);
  return ISO_DATE_RE.test(sv) ? sv.slice(0, 7) : sv;
}

/** A small categorical palette anchored on the brand accent. */
export function chartPalette(accent) {
  return [accent, '#22C55E', '#E0B341', '#EC4899', '#14B8A6', '#A78BFA', '#F97316'];
}

const COLOR_FALLBACK = {
  '--accent': '#0079AD',
  '--fg': '#E6E6E8',
  '--fg-mute': '#A0A0A8',
  '--fg-faint': '#6B6B74',
  '--num': '#92E1D8',
  '--border': '#1F1F26',
  '--border-faint': '#1A1A20',
  '--bg-modal': '#1A1A20',
};

/**
 * Resolve the theme tokens charts need into real color strings (canvas can't use
 * CSS vars). `read(name)` returns the computed value or ''; missing tokens fall
 * back to the dark-theme defaults so a chart always has usable colors.
 */
export function chartColors(read) {
  const get = (name) => {
    const v = (read && read(name)) || '';
    return String(v).trim() || COLOR_FALLBACK[name];
  };
  const accent = get('--accent');
  return {
    accent,
    fg: get('--fg'),
    fgMute: get('--fg-mute'),
    fgFaint: get('--fg-faint'),
    num: get('--num'),
    border: get('--border'),
    borderFaint: get('--border-faint'),
    bgModal: get('--bg-modal'),
    palette: chartPalette(accent),
  };
}

/**
 * Transform `rows` (capped) + columns into a library-agnostic
 * { labels, datasets:[{label, data}] } per the encoding in `cfg`.
 * - group-by (cfg.series set): pivot rows into one dataset per series value,
 *   aligned to the union of X categories (first-seen order), missing → 0.
 * - otherwise: one dataset per measure in `cfg.y`.
 */
export function buildChartData(columns, rows, cfg) {
  const slice = rows.slice(0, CHART_ROW_CAP);
  const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);

  if (cfg.series != null) {
    const yi = cfg.y[0];
    const cats = [];
    const groups = new Map(); // seriesValue -> Map(xCat -> y)
    for (const row of slice) {
      const xc = chartLabel(row[cfg.x]);
      if (!cats.includes(xc)) cats.push(xc);
      const sk = String(row[cfg.series]);
      if (!groups.has(sk)) groups.set(sk, new Map());
      groups.get(sk).set(xc, num(row[yi]));
    }
    const datasets = [...groups.entries()].map(([name, byCat]) => ({
      label: name,
      data: cats.map((xc) => (byCat.has(xc) ? byCat.get(xc) : 0)),
    }));
    return { labels: cats, datasets };
  }

  const labels = slice.map((row) => chartLabel(row[cfg.x]));
  const datasets = cfg.y.map((yi) => ({
    label: columns[yi].name,
    data: slice.map((row) => num(row[yi])),
  }));
  return { labels, datasets };
}

const withAlpha = (hex, frac) => {
  // #RRGGBB → rgba(...) at `frac` opacity. Non-hex passes through unchanged.
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${frac})`;
};

/**
 * Build a complete Chart.js config object (type + data + themed options) from a
 * result and the user's `cfg`. Pure: returns a plain object (Chart.js draws it).
 * `colors` is a resolved token bundle from `chartColors`.
 */
export function chartJsConfig(columns, rows, cfg, colors) {
  const { labels, datasets } = buildChartData(columns, rows, cfg);
  const pal = colors.palette;
  const horizontal = cfg.type === 'hbar';
  const isPie = cfg.type === 'pie';
  const isArea = cfg.type === 'area';
  const isLine = cfg.type === 'line' || isArea;
  const chartType = horizontal || cfg.type === 'bar' ? 'bar' : isLine ? 'line' : 'pie';

  const styled = datasets.map((ds, i) => {
    const color = pal[i % pal.length];
    if (isPie) {
      return { ...ds, backgroundColor: ds.data.map((_, j) => pal[j % pal.length]), borderColor: colors.bgModal, borderWidth: 1.5 };
    }
    if (isLine) {
      return { ...ds, borderColor: color, backgroundColor: isArea ? withAlpha(color, 0.14) : color, fill: isArea, tension: 0.25, pointRadius: 2, borderWidth: 2 };
    }
    return { ...ds, backgroundColor: color, borderRadius: 2, borderWidth: 0 };
  });

  const multi = datasets.length > 1;
  const grid = { color: colors.borderFaint, drawBorder: false };
  const ticks = { color: colors.fgMute, font: { family: 'var(--mono)', size: 10 } };
  const valueTicks = { ...ticks, callback: (v) => chartNumFmt(typeof v === 'number' ? v : Number(v)) };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: multi || isPie,
        position: isPie ? 'right' : 'top',
        align: 'start',
        labels: { color: colors.fgMute, boxWidth: 10, boxHeight: 10, font: { family: 'var(--mono)', size: 11 } },
      },
      tooltip: {
        backgroundColor: colors.bgModal,
        borderColor: colors.border,
        borderWidth: 1,
        titleColor: colors.fg,
        bodyColor: colors.fg,
        titleFont: { family: 'var(--mono)' },
        bodyFont: { family: 'var(--mono)' },
      },
    },
  };

  if (!isPie) {
    // The value axis carries humanized number ticks; the category axis carries
    // the X labels. indexAxis:'y' flips them for the horizontal-bar default.
    options.indexAxis = horizontal ? 'y' : 'x';
    const valueAxis = { grid, ticks: valueTicks, beginAtZero: true };
    const catAxis = { grid: { ...grid, display: false }, ticks };
    options.scales = horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis };
  }

  return { type: chartType, data: { labels, datasets: styled }, options };
}
