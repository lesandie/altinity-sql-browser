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
  flashToast._timer = setTimer(() => el.classList.remove('show'), duration);
  return el;
}
