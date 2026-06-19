// The sign-in screen.

import { h } from './dom.js';

/**
 * Render the login screen into `root`. `app` provides:
 *   host()           — environment label
 *   actions.login()  — start the OAuth flow (async, may throw)
 *   showLogin(msg)   — re-render with an error message
 */
export function renderLogin(app, errorMsg) {
  const root = app.root;
  root.replaceChildren(
    h('div', { class: 'login-screen' },
      h('div', { class: 'login-card' },
        h('div', { class: 'login-logo' }, 'A'),
        h('div', { class: 'login-title' }, 'Altinity SQL Browser'),
        h('div', { class: 'login-sub' }, 'Sign in to continue'),
        h('div', { class: 'login-env' }, app.host()),
        h('button', {
          class: 'login-btn',
          onclick: async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Redirecting…';
            try {
              await app.actions.login();
            } catch (err) {
              btn.disabled = false;
              btn.textContent = 'Sign in';
              app.showLogin(String((err && err.message) || err));
            }
          },
        }, 'Sign in'),
        errorMsg ? h('div', { class: 'login-error' }, errorMsg) : null,
        h('div', { class: 'login-foot' }, 'OAuth · OIDC discovery'),
      ),
    ),
  );
}
