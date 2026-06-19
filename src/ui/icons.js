// Inline SVG icons. `svg`/`svgFilled` build single-path icons; `iconEl` builds
// multi-element icons from an innerHTML body. `Icon` is the named set the UI
// uses. All return detached SVG elements.

const NS = 'http://www.w3.org/2000/svg';

/** Single-path stroked icon. */
export function svg(d, w = 12, hgt = 12, opts = {}) {
  const { stroke = 1.4, fill = 'none' } = opts;
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('width', w);
  el.setAttribute('height', hgt);
  el.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  if (fill) el.setAttribute('fill', fill);
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', stroke);
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  el.appendChild(path);
  return el;
}

/** Single-path filled icon. */
export function svgFilled(d, w = 12, hgt = 12) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('width', w);
  el.setAttribute('height', hgt);
  el.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  el.setAttribute('fill', 'currentColor');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  el.appendChild(path);
  return el;
}

/** Multi-element stroked icon from an innerHTML body. */
export function iconEl(body, w = 14, hgt = 14, stroke = 1.4) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('width', w);
  el.setAttribute('height', hgt);
  el.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', stroke);
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.innerHTML = body;
  return el;
}

export const Icon = {
  chev: () => svg('M3 2l3 3-3 3', 10, 10, { stroke: 1.6 }),
  chevDown: () => svg('M2 3l3 3 3-3', 10, 10, { stroke: 1.6 }),
  database: () => iconEl('<ellipse cx="7" cy="3" rx="5" ry="1.6"/><path d="M2 3v8c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6V3M2 7c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6"/>'),
  table: () => iconEl('<rect x="2" y="2.5" width="10" height="9" rx="1"/><path d="M2 5.5h10M2 8.5h10M5.5 5.5v6"/>'),
  col: () => iconEl('<rect x="2" y="2" width="8" height="8" rx="1"/><path d="M2 5h8M2 8h8"/>', 12, 12),
  play: () => svgFilled('M3 2l7 4-7 4z'),
  plus: () => svg('M6 2v8M2 6h8', 12, 12, { stroke: 1.6 }),
  close: () => svg('M2 2l6 6M8 2l-6 6', 10, 10, { stroke: 1.6 }),
  search: () => iconEl('<circle cx="5" cy="5" r="3"/><path d="M7.5 7.5L10 10"/>', 12, 12, 1.5),
  sun: () => iconEl('<circle cx="7" cy="7" r="2.4"/><path d="M7 1.5v1.4M7 11.1v1.4M1.5 7h1.4M11.1 7h1.4M3 3l1 1M10 10l1 1M11 3l-1 1M4 10l-1 1"/>'),
  moon: () => svg('M11 7.5A4 4 0 1 1 6.5 3a3.2 3.2 0 0 0 4.5 4.5z', 14, 14),
  clock: () => iconEl('<circle cx="5.5" cy="5.5" r="4"/><path d="M5.5 3.5V5.5L7 6.5"/>', 11, 11),
  rows: () => iconEl('<rect x="1.5" y="2" width="8" height="7" rx=".5"/><path d="M1.5 4.5h8M1.5 7h8"/>', 11, 11),
  bytes: () => svg('M2 8.5V3.5L5.5 6 9 3.5v5', 11, 11),
  sortAsc: () => svg('M5 8V2M2.5 4.5L5 2l2.5 2.5', 10, 10, { stroke: 1.5 }),
  sortDesc: () => svg('M5 2v6M2.5 5.5L5 8l2.5-2.5', 10, 10, { stroke: 1.5 }),
  star: (filled = false) => {
    const e = iconEl('<path d="M6 1.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L6 8.6l-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"/>', 12, 12, 1.2);
    e.setAttribute('fill', filled ? 'currentColor' : 'none');
    return e;
  },
  history: () => svg('M2.5 5.5a3.5 3.5 0 1 1 1 2.5M2 3v2.5h2.5M6 3.5V6l1.5 1', 12, 12),
  share: () => iconEl('<circle cx="9" cy="3" r="1.5"/><circle cx="3" cy="6" r="1.5"/><circle cx="9" cy="9" r="1.5"/><path d="M4.3 5.3l3.4-1.6M4.3 6.7l3.4 1.6"/>', 12, 12),
  chart: () => svg('M2 10V7M5 10V4M8 10V6M11 10V2', 12, 12),
  json: () => svg('M4 1.5C2.5 1.5 2.5 3 2.5 4S2.5 5 1.5 6c1 1 1 2 1 2s0 1.5 1.5 1.5M8 1.5c1.5 0 1.5 1.5 1.5 2.5s0 1 1 2c-1 1-1 2-1 2s0 1.5-1.5 1.5', 12, 12),
  table2: () => iconEl('<rect x="1.5" y="2" width="9" height="8" rx=".5"/><path d="M1.5 4.5h9M1.5 7h9M4.5 4.5v5"/>', 12, 12),
  shortcuts: () => iconEl('<rect x="1.5" y="3" width="9" height="6" rx="1"/><path d="M3.5 5h.01M6 5h.01M8.5 5h.01M3.5 7h5"/>', 12, 12, 1.3),
};
