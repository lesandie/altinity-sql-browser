// Draggable panel splitters. `dragValue` is the pure geometry; `startDrag`
// wires window mouse events and persists the result. Both are injectable
// (window + persistence) for testing.

import { clamp } from '../core/format.js';

/**
 * Compute the new size for a drag. `axis` is 'col' (sidebar px), 'sideRow'
 * (sidebar vertical %), or 'row' (editor/results %). `rect` is the bounding
 * rect of the container being split (unused for 'col').
 */
export function dragValue(axis, ev, rect) {
  if (axis === 'col') return clamp(ev.clientX, 180, 420);
  const pct = clamp(((ev.clientY - rect.top) / (rect.bottom - rect.top)) * 100,
    axis === 'sideRow' ? 25 : 15, 85);
  return pct;
}

/**
 * Begin a splitter drag.
 * @param ev      the mousedown event (currentTarget = the handle)
 * @param axis    'col' | 'sideRow' | 'row'
 * @param ctx     { win, state, save, rectFor(axis), apply(axis, value) }
 */
export function startDrag(ev, axis, ctx) {
  ev.preventDefault();
  const handle = ev.currentTarget;
  const win = ctx.win || window;
  handle.classList.add('dragging');
  const onMove = (move) => {
    const value = dragValue(axis, move, ctx.rectFor(axis));
    if (axis === 'col') ctx.state.sidebarPx = value;
    else if (axis === 'sideRow') ctx.state.sideSplitPct = value;
    else ctx.state.editorPct = value;
    ctx.apply(axis, value);
  };
  const onUp = () => {
    handle.classList.remove('dragging');
    win.removeEventListener('mousemove', onMove);
    win.removeEventListener('mouseup', onUp);
    if (axis === 'col') ctx.save('sidebarPx', ctx.state.sidebarPx);
    else if (axis === 'sideRow') ctx.save('sideSplitPct', ctx.state.sideSplitPct);
    else ctx.save('editorPct', ctx.state.editorPct);
  };
  win.addEventListener('mousemove', onMove);
  win.addEventListener('mouseup', onUp);
}
