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
});
