import { describe, it, expect, vi } from 'vitest';
import { renderHighlightInto, mountEditor, insertAtCursor, replaceEditor, IDENT_MIME } from '../../src/ui/editor.js';
import { makeApp } from '../helpers/fake-app.js';

describe('renderHighlightInto', () => {
  it('paints tokens as spans and whitespace as text, ending with newline', () => {
    const pre = document.createElement('pre');
    renderHighlightInto(pre, 'SELECT 1');
    expect(pre.querySelector('.sql-keyword').textContent).toBe('SELECT');
    expect(pre.querySelector('.sql-number').textContent).toBe('1');
    expect(pre.textContent.endsWith('\n')).toBe(true);
  });
  it('forwards dynamic keyword/func sets to the tokenizer (#25)', () => {
    const pre = document.createElement('pre');
    renderHighlightInto(pre, 'FOO bar', { keywords: new Set(['FOO']), funcs: new Set(['bar']) });
    expect(pre.querySelector('.sql-keyword').textContent).toBe('FOO');
    expect(pre.querySelector('.sql-func').textContent).toBe('bar');
  });
});

describe('mountEditor', () => {
  function mount() {
    const app = makeApp();
    app.activeTab().sql = 'SELECT 1';
    const container = document.createElement('div');
    mountEditor(app, container);
    return { app, container, ta: app.dom.editorTextarea };
  }

  it('builds the editor and syncs the active tab', () => {
    const { container, app } = mount();
    expect(container.querySelector('.sql-editor')).not.toBeNull();
    expect(app.dom.editorTextarea.value).toBe('SELECT 1');
    expect(app.dom.editorGutter.children.length).toBe(1);
  });
  it('highlights with the connection reference sets when app.refData is present (#25)', () => {
    const app = makeApp();
    app.refData = { keywordSet: new Set(['FOO']), funcSet: new Set() };
    app.activeTab().sql = 'FOO';
    mountEditor(app, document.createElement('div'));
    expect(app.dom.editorPre.querySelector('.sql-keyword').textContent).toBe('FOO');
  });
  it('typing updates the tab, marks dirty, repaints, and rerenders', () => {
    const { app, ta } = mount();
    ta.value = 'SELECT 2\nFROM t';
    ta.dispatchEvent(new Event('input'));
    expect(app.activeTab().sql).toBe('SELECT 2\nFROM t');
    expect(app.activeTab().dirty).toBe(true);
    expect(app.dom.editorGutter.children.length).toBe(2);
    expect(app.actions.rerenderTabs).toHaveBeenCalled();
    expect(app.actions.updateSaveBtn).toHaveBeenCalled();
  });
  it('scroll syncs pre + gutter to the textarea on both axes', () => {
    const { app, ta } = mount();
    ta.scrollTop = 12;
    ta.scrollLeft = 4;
    ta.dispatchEvent(new Event('scroll'));
    expect(app.dom.editorPre.scrollTop).toBe(12);
    expect(app.dom.editorPre.scrollLeft).toBe(4); // horizontal sync (long lines)
    expect(app.dom.editorGutter.scrollTop).toBe(12);
    // NOTE: the real-world misalignment fixed alongside this was a render-layer
    // bug — the textarea's own scrollbar shrank its clientHeight, so the pre
    // (overflow:hidden, no scrollbar) couldn't scroll as far and the highlight
    // clamped behind the selection. The fix is CSS (hide the textarea
    // scrollbars so both client boxes match); happy-dom has no scrollbar layout,
    // so that part is verified in a real browser, not here. This guards the
    // sync wiring both layers depend on.
  });
  it('Tab key inserts two spaces at the cursor', () => {
    const { ta } = mount();
    ta.value = 'ab';
    ta.selectionStart = ta.selectionEnd = 1;
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    ta.dispatchEvent(e);
    expect(ta.value).toBe('a  b');
    expect(e.defaultPrevented).toBe(true);
  });
  it('non-Tab keydown is ignored', () => {
    const { ta } = mount();
    const before = ta.value;
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(ta.value).toBe(before);
  });
  it('dragover prevents default so the textarea accepts drops', () => {
    const { ta } = mount();
    const e = new Event('dragover', { cancelable: true });
    ta.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
  it('dropping a schema identifier inserts it at the cursor', () => {
    const { app, ta } = mount();
    ta.value = 'SELECT  FROM t';
    ta.selectionStart = ta.selectionEnd = 7;
    const e = new Event('drop', { cancelable: true });
    e.dataTransfer = { getData: (m) => (m === IDENT_MIME ? 'db.tbl' : '') };
    ta.dispatchEvent(e);
    expect(ta.value).toBe('SELECT db.tbl FROM t');
    expect(e.defaultPrevented).toBe(true);
  });
  it('a drop without our identifier is left to native handling', () => {
    const { ta } = mount();
    const before = ta.value;
    const e = new Event('drop', { cancelable: true });
    e.dataTransfer = { getData: () => '' };
    ta.dispatchEvent(e);
    expect(ta.value).toBe(before);
    expect(e.defaultPrevented).toBe(false);
  });
  it('a drop with no dataTransfer is a no-op', () => {
    const { ta } = mount();
    const before = ta.value;
    const e = new Event('drop', { cancelable: true });
    ta.dispatchEvent(e);
    expect(ta.value).toBe(before);
    expect(e.defaultPrevented).toBe(false);
  });
});

describe('insertAtCursor', () => {
  it('inserts text at the cursor and fires input', () => {
    const app = makeApp();
    mountEditor(app, document.createElement('div'));
    const ta = app.dom.editorTextarea;
    ta.value = 'SELECT  FROM t';
    ta.selectionStart = ta.selectionEnd = 7;
    insertAtCursor(app, 'x');
    expect(ta.value).toBe('SELECT x FROM t');
    expect(app.activeTab().sql).toBe('SELECT x FROM t');
  });
  it('no-ops without a textarea', () => {
    const app = makeApp();
    expect(() => insertAtCursor(app, 'x')).not.toThrow();
  });
  it('uses execCommand(insertText) when available, skipping the manual splice', () => {
    const app = makeApp();
    mountEditor(app, document.createElement('div'));
    const ta = app.dom.editorTextarea;
    ta.value = 'AB';
    ta.selectionStart = ta.selectionEnd = 1;
    const spy = vi.fn(() => true);
    document.execCommand = spy;
    try {
      insertAtCursor(app, 'x');
      expect(spy).toHaveBeenCalledWith('insertText', false, 'x');
      expect(ta.value).toBe('AB'); // execCommand owns the insert; manual splice skipped
    } finally {
      delete document.execCommand;
    }
  });
});

describe('replaceEditor', () => {
  function mounted(sql = '') {
    const app = makeApp();
    app.activeTab().sql = sql;
    mountEditor(app, document.createElement('div'));
    return { app, ta: app.dom.editorTextarea };
  }
  it('swaps the whole content', () => {
    const { ta, app } = mounted('select 1');
    replaceEditor(app, 'SELECT\n  1');
    expect(ta.value).toBe('SELECT\n  1');
    expect(app.activeTab().sql).toBe('SELECT\n  1');
  });
  it('no-ops without a textarea', () => {
    const app = makeApp();
    expect(() => replaceEditor(app, 'x')).not.toThrow();
  });
});
