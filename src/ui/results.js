// The results pane: a view switcher (Table | JSON | Chart, or a single Raw
// view for TSV/JSON output) plus the renderers. Heavy logic (sorting, axis
// selection) lives in core/ and is reused here.

import { h } from './dom.js';
import { Icon } from './icons.js';
import { formatRows, formatBytes, isNumericType } from '../core/format.js';
import { sortRows } from '../core/sort.js';
import { pickChartAxes, chartSeries } from '../core/chart-data.js';

const VIS_CAP = 5000;
const NS = 'http://www.w3.org/2000/svg';

export function renderResults(app) {
  const region = app.dom.resultsRegion;
  if (!region) return;
  const tab = app.activeTab();
  const r = tab.result;
  const body = h('div', { class: 'results' });
  body.appendChild(buildToolbar(app, r));

  const inner = h('div', { class: 'res-body' });
  const streamingBlank = app.state.running && (!r || (r.rows.length === 0 && r.rawText == null));
  if (streamingBlank) {
    inner.appendChild(h('div', { class: 'progress-bar', style: { '--progress': (r ? r.pct : 0) + '%' } }, h('i')));
    inner.appendChild(h('div', { class: 'placeholder' },
      h('div', null, 'Streaming results…'),
      r ? h('code', null, formatRows(r.progress.rows) + ' rows · ' + formatBytes(r.progress.bytes)) : null));
  } else if (!r) {
    inner.appendChild(h('div', { class: 'empty-results' },
      h('div', { class: 'chip' }, Icon.play()),
      h('div', null, 'Press ', h('kbd', null, '⌘↵'), ' to run query')));
  } else if (r.error) {
    inner.appendChild(h('div', { class: 'results-error' }, r.error));
  } else if (r.rawText != null) {
    inner.appendChild(h('div', { class: 'raw-text-view', tabindex: '0' }, r.rawText));
  } else if (r.rows.length === 0) {
    inner.appendChild(h('div', { class: 'placeholder' }, h('div', null, 'Query returned 0 rows.')));
  } else if (app.state.resultView === 'json') {
    inner.appendChild(renderJson(r));
  } else if (app.state.resultView === 'chart') {
    inner.appendChild(renderChart(r));
  } else {
    inner.appendChild(renderTable(app, r));
    if (app.state.running) {
      inner.appendChild(h('div', { class: 'progress-bar', style: { '--progress': r.pct + '%' } }, h('i')));
    }
  }
  body.appendChild(inner);
  region.replaceChildren(body);
}

function buildToolbar(app, r) {
  const isRaw = r && r.rawText != null;
  const toolbar = h('div', { class: 'res-toolbar' });
  const tabs = h('div', { class: 'result-view-tabs' });
  const views = isRaw
    ? [{ id: 'raw', label: r.rawFormat, icon: r.rawFormat === 'JSON' ? Icon.json() : Icon.table2() }]
    : [
        { id: 'table', label: 'Table', icon: Icon.table2() },
        { id: 'json', label: 'JSON', icon: Icon.json() },
        { id: 'chart', label: 'Chart', icon: Icon.chart() },
      ];
  for (const v of views) {
    const isActive = app.state.resultView === v.id || (isRaw && v.id === 'raw');
    tabs.appendChild(h('button', {
      class: 'result-view-tab' + (isActive ? ' active' : ''),
      onclick: () => { app.state.resultView = v.id; renderResults(app); },
    }, v.icon, h('span', null, v.label)));
  }
  toolbar.appendChild(tabs);
  toolbar.appendChild(h('div', { style: { flex: '1' } }));
  if (r) {
    const ms = (r.progress.elapsed_ns / 1e6).toFixed(0);
    toolbar.appendChild(h('div', { class: 'stat' }, h('span', { class: 'ic' }, Icon.clock()), h('span', { class: 'v' }, ms + ' ms')));
    toolbar.appendChild(h('div', { class: 'stat' }, h('span', { class: 'ic' }, Icon.rows()),
      h('span', { class: 'v' }, (r.rawText != null ? '—' : r.rows.length) + ' rows')));
    toolbar.appendChild(h('div', { class: 'stat', title: r.progress.rows + ' rows scanned' },
      h('span', { class: 'ic' }, Icon.bytes()), h('span', { class: 'v' }, formatBytes(r.progress.bytes))));
  }
  return toolbar;
}

export function renderJson(r) {
  const arr = r.rows.slice(0, VIS_CAP).map((row) => {
    const o = {};
    r.columns.forEach((c, i) => { o[c.name] = row[i]; });
    return o;
  });
  return h('div', { class: 'json-view', tabindex: '0' }, JSON.stringify(arr, null, 2));
}

export function renderTable(app, r) {
  const { col, dir } = app.state.resultSort;
  const rows = sortRows(r.rows, col, dir);
  const wrap = h('div', { class: 'res-table-wrap' });
  const table = document.createElement('table');
  table.className = 'res-table';

  const trh = document.createElement('tr');
  trh.appendChild(h('th', { style: { textAlign: 'center', color: 'var(--fg-faint)', minWidth: '36px' } }, '#'));
  r.columns.forEach((c, i) => {
    const isSort = col === i;
    trh.appendChild(h('th', {
      onclick: () => {
        if (isSort) app.state.resultSort.dir = dir === 'asc' ? 'desc' : 'asc';
        else { app.state.resultSort.col = i; app.state.resultSort.dir = 'asc'; }
        renderResults(app);
      },
    }, h('div', { class: 'h-inner' },
      h('span', { class: 'h-name' }, c.name),
      h('span', { class: 'h-type' }, c.type),
      h('span', { style: { flex: '1' } }),
      isSort ? h('span', { class: 'h-sort' }, dir === 'asc' ? Icon.sortAsc() : Icon.sortDesc()) : null)));
  });
  const thead = document.createElement('thead');
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.slice(0, VIS_CAP).forEach((row, ri) => {
    const tr = document.createElement('tr');
    tr.appendChild(h('td', { class: 'idx' }, String(ri + 1)));
    row.forEach((v, ci) => {
      const isNum = isNumericType(r.columns[ci].type);
      tr.appendChild(h('td', { class: isNum ? 'num' : '' }, v == null ? '' : String(v)));
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  if (rows.length > VIS_CAP) {
    wrap.appendChild(h('div', {
      style: { padding: '10px 14px', fontSize: '11px', color: 'var(--fg-faint)', fontFamily: 'var(--mono)', borderTop: '1px solid var(--border)' },
    }, '… + ' + (rows.length - VIS_CAP) + ' more rows truncated for display.'));
  }
  return wrap;
}

export function renderChart(r) {
  const { xIdx, yIdx, ok } = pickChartAxes(r.columns);
  if (!ok) return h('div', { class: 'placeholder' }, h('div', null, 'No numeric columns to chart.'));
  const { labels, values, max } = chartSeries(r.rows, xIdx, yIdx);

  const wrap = h('div', { class: 'chart-view' });
  wrap.appendChild(h('div', { class: 'chart-controls' },
    h('span', null, 'X: ', h('strong', { style: { color: 'var(--fg)' } }, r.columns[xIdx].name)),
    h('span', null, 'Y: ', h('strong', { style: { color: 'var(--fg)' } }, r.columns[yIdx].name)),
    h('span', { style: { color: 'var(--fg-faint)' } }, '(showing first ' + values.length + ' rows)')));

  const W = 600, H = 280, P = { l: 50, r: 12, t: 10, b: 36 };
  const innerW = W - P.l - P.r, innerH = H - P.t - P.b;
  const step = innerW / Math.max(values.length, 1);
  const barW = step * 0.7;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.width = '100%';
  svg.style.height = '100%';

  const line = (x1, y1, x2, y2) => {
    const el = document.createElementNS(NS, 'line');
    el.setAttribute('x1', x1); el.setAttribute('y1', y1);
    el.setAttribute('x2', x2); el.setAttribute('y2', y2);
    el.setAttribute('stroke', 'currentColor'); el.setAttribute('opacity', '0.25');
    return el;
  };
  const text = (x, y, anchor, str) => {
    const el = document.createElementNS(NS, 'text');
    el.setAttribute('x', x); el.setAttribute('y', y);
    el.setAttribute('text-anchor', anchor); el.setAttribute('font-size', '10');
    el.setAttribute('fill', 'currentColor'); el.setAttribute('opacity', '0.6');
    el.textContent = str;
    return el;
  };

  svg.appendChild(line(P.l, P.t + innerH, P.l + innerW, P.t + innerH));
  svg.appendChild(text(P.l - 6, P.t + 10, 'end', formatRows(max)));
  svg.appendChild(text(P.l - 6, P.t + innerH + 4, 'end', '0'));

  values.forEach((v, i) => {
    const x = P.l + i * step + (step - barW) / 2;
    const hgt = max > 0 ? (v / max) * innerH : 0;
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', P.t + innerH - hgt);
    rect.setAttribute('width', barW); rect.setAttribute('height', hgt);
    rect.setAttribute('fill', 'var(--accent)'); rect.setAttribute('rx', '1.5');
    const t = document.createElementNS(NS, 'title');
    t.textContent = labels[i] + ': ' + v;
    rect.appendChild(t);
    svg.appendChild(rect);
  });

  const every = Math.max(1, Math.ceil(labels.length / 12));
  labels.forEach((lab, i) => {
    if (i % every !== 0) return;
    const short = lab.length > 12 ? lab.slice(0, 11) + '…' : lab;
    svg.appendChild(text(P.l + i * step + step / 2, P.t + innerH + 16, 'middle', short));
  });

  const area = h('div', { class: 'chart-area' });
  area.appendChild(svg);
  wrap.appendChild(area);
  return wrap;
}
