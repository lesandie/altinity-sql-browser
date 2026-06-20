// The sign-in screen. With several configured IdPs it shows one button per
// provider; with a single IdP (or a legacy single-object config) it shows one
// plain "Sign in" button.

import { h } from './dom.js';

// A sign-in button carrying the disable → "Redirecting…" → restore-on-error
// flow. `idpId` is undefined for the single-IdP default (login() picks the only
// one); otherwise it selects that provider.
function signInButton(app, label, idpId) {
  return h('button', {
    class: 'login-btn',
    onclick: async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Redirecting…';
      try {
        await app.actions.login(idpId);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = label;
        app.showLogin(String((err && err.message) || err));
      }
    },
  }, label);
}

/**
 * Render the login screen into `root`. `app` provides:
 *   host()             — environment label
 *   actions.login(id?) — start the OAuth flow for IdP `id` (async, may throw)
 *   loadIdps()         — resolve the configured IdP list (async)
 *   showLogin(msg)     — re-render with an error message
 */
export function renderLogin(app, errorMsg) {
  const root = app.root;
  const actions = h('div', { class: 'login-actions' }, signInButton(app, 'Sign in'));
  root.replaceChildren(
    h('div', { class: 'login-screen' },
      h('div', { class: 'login-card' },
        h('div', { class: 'login-logo' }, 'A'),
        h('div', { class: 'login-title' }, 'Altinity SQL Browser'),
        h('div', { class: 'login-sub' }, 'Sign in to continue'),
        h('div', { class: 'login-env' }, app.host()),
        actions,
        errorMsg ? h('div', { class: 'login-error' }, errorMsg) : null,
        h('div', { class: 'login-foot' }, 'OAuth · OIDC discovery'),
      ),
    ),
  );
  // With multiple IdPs, swap the single button for one button per provider.
  if (app.loadIdps) {
    app.loadIdps().then(({ idps }) => {
      if (idps && idps.length > 1) {
        actions.replaceChildren(
          ...idps.map((idp) => signInButton(app, 'Sign in with ' + idp.label, idp.id)),
        );
      }
    }).catch(() => { /* keep the single button; a click surfaces the config error */ });
  }
}
