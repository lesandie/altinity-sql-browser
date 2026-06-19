import { describe, it, expect, vi } from 'vitest';
import { renderHighlightInto, mountEditor, insertAtCursor } from '../../src/ui/editor.js';
import { makeApp } from '../helpers/fake-app.js';

describe('renderHighlightInto', () => {
  it('paints tokens as spans and whitespace as text, ending with newline', () => {
    const pre = document.createElement('pre');
    renderHighlightInto(pre, 'SELECT 1');
    expect(pre.querySelector('.sql-keyword').textContent).toBe('SELECT');
    expect(pre.querySelector('.sql-number').textContent).toBe('1');
    expect(pre.textContent.endsWith('\n')).toBe(true);
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
  it('typing updates the tab, marks dirty, repaints, and rerenders', () => {
    const { app, ta } = mount();
    ta.value = 'SELECT 2\nFROM t';
    ta.dispatchEvent(new Event('input'));
    expect(app.activeTab().sql).toBe('SELECT 2\nFROM t');
    expect(app.activeTab().dirty).toBe(true);
    expect(app.dom.editorGutter.children.length).toBe(2);
    expect(app.actions.rerenderTabs).toHaveBeenCalled();
    expect(app.actions.updateStar).toHaveBeenCalled();
  });
  it('scroll syncs pre + gutter to the textarea', () => {
    const { app, ta } = mount();
    ta.scrollTop = 12;
    ta.scrollLeft = 4;
    ta.dispatchEvent(new Event('scroll'));
    expect(app.dom.editorPre.scrollTop).toBe(12);
    expect(app.dom.editorGutter.scrollTop).toBe(12);
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
});
