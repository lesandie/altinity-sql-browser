import { describe, it, expect, vi } from 'vitest';
import { renderLogin } from '../../src/ui/login.js';
import { makeApp } from '../helpers/fake-app.js';

describe('renderLogin', () => {
  it('renders the card with host + no error', () => {
    const app = makeApp();
    renderLogin(app);
    expect(app.root.querySelector('.login-title').textContent).toContain('Altinity');
    expect(app.root.querySelector('.login-env').textContent).toBe('test.host');
    expect(app.root.querySelector('.login-error')).toBeNull();
  });
  it('renders an error message when given', () => {
    const app = makeApp();
    renderLogin(app, 'boom');
    expect(app.root.querySelector('.login-error').textContent).toBe('boom');
  });
  it('sign-in click calls login()', async () => {
    const app = makeApp({ actions: { ...makeApp().actions, login: vi.fn(async () => {}) } });
    renderLogin(app);
    const btn = app.root.querySelector('.login-btn');
    btn.dispatchEvent(new Event('click'));
    await Promise.resolve();
    expect(app.actions.login).toHaveBeenCalled();
    expect(btn.textContent).toBe('Redirecting…');
  });
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('sign-in failure restores button + shows error', async () => {
    const showLogin = vi.fn();
    const login = vi.fn(async () => { throw new Error('nope'); });
    const app = makeApp({ showLogin, actions: { ...makeApp().actions, login } });
    renderLogin(app);
    const btn = app.root.querySelector('.login-btn');
    btn.dispatchEvent(new Event('click'));
    await tick();
    expect(showLogin).toHaveBeenCalledWith('nope');
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Sign in');
  });
  it('failure with a non-Error value stringifies it', async () => {
    const showLogin = vi.fn();
    const login = vi.fn(async () => { throw 'rawstr'; });
    const app = makeApp({ showLogin, actions: { ...makeApp().actions, login } });
    renderLogin(app);
    const btn = app.root.querySelector('.login-btn');
    btn.dispatchEvent(new Event('click'));
    await tick();
    expect(showLogin).toHaveBeenCalledWith('rawstr');
  });

  it('multiple IdPs → one button per provider, clicking passes the IdP id', async () => {
    const login = vi.fn(async () => {});
    const app = makeApp({
      actions: { ...makeApp().actions, login },
      loadIdps: async () => ({ idps: [{ id: 'g', label: 'Google' }, { id: 'a', label: 'Acme SSO' }] }),
    });
    renderLogin(app);
    await tick();
    const btns = [...app.root.querySelectorAll('.login-btn')];
    expect(btns.map((b) => b.textContent)).toEqual(['Sign in with Google', 'Sign in with Acme SSO']);
    btns[1].dispatchEvent(new Event('click'));
    await tick();
    expect(login).toHaveBeenCalledWith('a');
  });
  it('a single IdP keeps the lone Sign in button', async () => {
    const app = makeApp({ loadIdps: async () => ({ idps: [{ id: 'g', label: 'Google' }] }) });
    renderLogin(app);
    await tick();
    const btns = [...app.root.querySelectorAll('.login-btn')];
    expect(btns).toHaveLength(1);
    expect(btns[0].textContent).toBe('Sign in');
  });
  it('keeps the single button when the IdP list fails to load', async () => {
    const app = makeApp({ loadIdps: async () => { throw new Error('no config'); } });
    renderLogin(app);
    await tick();
    expect(app.root.querySelectorAll('.login-btn')).toHaveLength(1);
  });
});
