import { test, expect } from '@playwright/test';

// Regression guard for the editor's highlight/selection alignment.
//
// The bug: a long line gives the <textarea> a horizontal scrollbar, which
// shrinks its clientHeight (~10px). That made the textarea's max vertical
// scrollTop larger than the highlight <pre>'s (overflow:hidden, no scrollbar),
// so scrolling to the bottom clamped pre.scrollTop below ta.scrollTop and the
// painted glyphs lagged the native selection — worst on the last line.
// Repro shape: shift-click a CREATE TABLE, scroll down, select the last line.
//
// This can only be caught in a real engine — happy-dom has no scrollbar layout.
test.describe('editor highlight/selection alignment', () => {
  test('highlight tracks the textarea scrolled to the bottom with a long line', async ({ page }) => {
    await page.goto('/tests/e2e/editor.html');
    await page.waitForFunction(() => window.__ready === true);

    // Tall content whose LAST line is long enough to force a horizontal scrollbar.
    const sql = [
      ...Array.from({ length: 30 }, (_, i) => `SELECT col_${i} FROM t WHERE x = ${i}`),
      `COMMENT '${'x'.repeat(400)}'`,
    ].join('\n');
    await page.evaluate((s) => window.__setSql(s), sql);

    const m = await page.evaluate(() => {
      const ta = window.__app.dom.editorTextarea;
      const pre = window.__app.dom.editorPre;
      ta.focus();
      ta.scrollTop = ta.scrollHeight; // scroll to the very bottom
      ta.dispatchEvent(new Event('scroll'));
      return {
        taClientH: ta.clientHeight,
        preClientH: pre.clientHeight,
        taScrollTop: ta.scrollTop,
        preScrollTop: pre.scrollTop,
      };
    });

    // The textarea must not reserve scrollbar space the highlight lacks…
    expect(m.taClientH).toBe(m.preClientH);
    // …so the highlight reaches the same offset instead of clamping behind it.
    expect(Math.abs(m.taScrollTop - m.preScrollTop)).toBeLessThan(1);
  });
});
