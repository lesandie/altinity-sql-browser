// Transient toast notification. `flashToast` is injectable over a document +
// timer so it can be tested deterministically.

export function flashToast(text, opts = {}) {
  const doc = opts.document || document;
  const setTimer = opts.setTimeout || setTimeout;
  const clearTimer = opts.clearTimeout || clearTimeout;
  const duration = opts.duration ?? 1600;

  let el = doc.querySelector('.share-toast');
  if (!el) {
    el = doc.createElement('div');
    el.className = 'share-toast';
    doc.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  if (flashToast._timer) clearTimer(flashToast._timer);
  flashToast._timer = setTimer(() => { flashToast._timer = null; el.classList.remove('show'); }, duration);
  // Click to dismiss early / reread — rebound each call so it always clears
  // *this* call's timer (the element is reused across calls, opts may differ).
  el.onclick = () => {
    if (flashToast._timer) { clearTimer(flashToast._timer); flashToast._timer = null; }
    el.classList.remove('show');
  };
  return el;
}
