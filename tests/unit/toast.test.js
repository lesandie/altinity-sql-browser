import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flashToast } from '../../src/ui/toast.js';

beforeEach(() => {
  document.body.innerHTML = '';
  flashToast._timer = null;
});

describe('flashToast', () => {
  it('creates a toast, shows it, and schedules hide', () => {
    const setTimeout = vi.fn(() => 7);
    const el = flashToast('hello', { document, setTimeout, duration: 500 });
    expect(el.textContent).toBe('hello');
    expect(el.classList.contains('show')).toBe(true);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
    // run the scheduled hide
    setTimeout.mock.calls[0][0]();
    expect(el.classList.contains('show')).toBe(false);
  });
  it('reuses the existing toast element and clears the prior timer', () => {
    const clearTimeout = vi.fn();
    const setTimeout = vi.fn(() => 1);
    const a = flashToast('one', { document, setTimeout, clearTimeout });
    const b = flashToast('two', { document, setTimeout, clearTimeout });
    expect(a).toBe(b);
    expect(b.textContent).toBe('two');
    expect(clearTimeout).toHaveBeenCalledWith(1);
    expect(document.querySelectorAll('.share-toast')).toHaveLength(1);
  });
  it('defaults document/timers (smoke)', () => {
    const el = flashToast('x');
    expect(el.classList.contains('show')).toBe(true);
  });
});
