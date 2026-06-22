// The sign-in screen. Two auth paths, encoded directly in the UI:
//   • SSO  — the existing OAuth flow, bound to the serving host. One button per
//     configured IdP (a single IdP shows one "Continue with SSO"). Hidden when
//     no IdP is configured.
//   • Credentials — a ClickHouse username/password (HTTP Basic), optionally
//     against another host via the "Advanced" disclosure. Hidden when the
//     deployment sets `basic_login: false`.
// When both username and password are non-empty the UI flips: Connect becomes
// the primary button and SSO demotes to a secondary outline — visually encoding
// "credentials are used instead of SSO". A live "Target" row always resolves the
// combined state (effective host + as <user> / via SSO).

import { h } from './dom.js';
import { Icon } from './icons.js';

/**
 * Render the login screen into `app.root`. `app` provides:
 *   host()                     — the serving host (where SSO authenticates)
 *   actions.login(id?)         — start the OAuth flow for IdP `id` (async)
 *   actions.connect({...})     — credential sign-in; renders the app on success
 *   loadIdps()                 — resolve { idps, basicLogin } (async)
 *   showLogin(msg)             — re-render with an error message
 */
export function renderLogin(app, errorMsg) {
  const cur = app.host();
  let busy = null; // 'sso' | 'creds' — guards against double-submit
  let showPw = false;
  let advOpen = false;
  let ssoBtns = [];

  const hasCreds = () => userInput.value.trim().length > 0 && passInput.value.length > 0;

  // --- credential fields ---
  const fld = (over) => h('input', {
    class: 'login-input mono', type: 'text', spellcheck: 'false', autocomplete: 'off',
    oninput: update, onkeydown: onCredsKey, ...over,
  });
  const userInput = fld({ placeholder: 'default' });
  const passInput = fld({ type: 'password', placeholder: '••••••••' });
  const hostInput = fld({ placeholder: cur + ':8443' });

  const eyeBtn = h('button', {
    class: 'login-eye', type: 'button', tabindex: '-1', title: 'Show password',
    onclick: () => {
      showPw = !showPw;
      passInput.type = showPw ? 'text' : 'password';
      eyeBtn.title = showPw ? 'Hide password' : 'Show password';
      eyeBtn.replaceChildren(showPw ? Icon.eyeOff() : Icon.eye());
    },
  }, Icon.eye());

  // --- advanced (host override) ---
  const advChev = h('span', { class: 'login-disc-chev' }, Icon.chevDown());
  const advField = h('div', { class: 'login-adv-field', style: { display: 'none' } },
    h('label', { class: 'login-lbl' }, 'Server address (host:port)'),
    hostInput,
    h('div', { class: 'login-hint' },
      'Leave blank to use this server. A custom host applies to credential sign-in only — SSO always authenticates on ',
      h('span', { class: 'mono' }, cur), '.'));
  const advToggle = h('button', {
    class: 'login-disc', type: 'button',
    onclick: () => {
      advOpen = !advOpen;
      advField.style.display = advOpen ? '' : 'none';
      advChev.style.transform = advOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
    },
  }, advChev, h('span', null, 'Advanced — connect to another server'));
  advChev.style.transform = 'rotate(-90deg)';

  // --- connect button + live target row ---
  const connectBtn = h('button', { class: 'login-btn btn-ghost', disabled: true, onclick: doConnect },
    h('span', null, 'Connect'), Icon.arrow());
  const targetHostEl = h('span', { class: 'lt-host' }, cur);
  const targetAsEl = h('span', { class: 'lt-as' }, 'via SSO');

  // --- SSO section (populated async once the IdP list resolves) ---
  const ssoSection = h('div', { class: 'login-sso' });
  const divider = h('div', { class: 'login-divider', style: { display: 'none' } },
    h('span', null, 'or use credentials'));

  const credSection = h('div', { class: 'login-creds' },
    divider,
    h('div', { class: 'login-field' }, h('label', { class: 'login-lbl' }, 'Username'), userInput),
    h('div', { class: 'login-field' },
      h('label', { class: 'login-lbl' }, 'Password'),
      h('div', { class: 'login-input-wrap' }, passInput, eyeBtn)),
    h('div', { class: 'login-advanced' }, advToggle, advField),
    connectBtn,
    h('div', { class: 'login-target' },
      h('span', { class: 'lt-dot' }),
      h('span', { class: 'lt-key' }, 'Target'),
      targetHostEl,
      h('span', { style: { flex: '1' } }),
      targetAsEl));

  const card = h('div', { class: 'login-card login-card-wide' },
    h('div', { class: 'login-brand' },
      h('div', { class: 'login-logo' }, 'A'),
      h('div', { class: 'login-brand-text' },
        h('div', { class: 'login-brand-name' }, 'Altinity SQL Browser'),
        h('div', { class: 'login-brand-sub mono' }, 'ClickHouse query console'))),
    h('div', { class: 'login-h1' }, 'Sign in'),
    h('div', { class: 'login-sub' }, 'Use single sign-on for this server, or connect with ClickHouse credentials.'),
    ssoSection,
    credSection,
    errorMsg ? h('div', { class: 'login-error' }, errorMsg) : null,
    h('div', { class: 'login-foot' },
      h('a', {
        class: 'login-foot-link', href: 'https://github.com/Altinity/altinity-sql-browser',
        target: '_blank', rel: 'noopener noreferrer',
      }, Icon.github(), h('span', null, 'Source')),
      h('span', { style: { flex: '1' } }),
      h('span', { class: 'mono login-foot-ver' }, 'OAuth · credentials')));

  app.root.replaceChildren(h('div', { class: 'login-screen' }, card));
  update();

  // Resolve the configured IdPs (and the basic_login flag) and reconcile which
  // sections are shown. On failure keep credentials visible (fail-open — OAuth
  // can't work without config anyway) and show no SSO.
  app.loadIdps().then(({ idps, basicLogin }) => {
    if (basicLogin === false) credSection.remove();
    populateSso(idps);
    divider.style.display = (ssoBtns.length && basicLogin !== false) ? '' : 'none';
    update();
  }).catch(() => { /* no config → credentials only */ });

  function populateSso(idps) {
    ssoBtns = [];
    if (!idps || !idps.length) return;
    const mk = (idpId, label) => {
      const b = h('button', { class: 'login-btn btn-primary', onclick: () => doSso(idpId, b) },
        Icon.shield(), h('span', null, label));
      ssoBtns.push(b);
      return b;
    };
    const btns = idps.length === 1
      ? [mk(idps[0].id, 'Continue with SSO')]
      : idps.map((i) => mk(i.id, 'Continue with ' + i.label));
    ssoSection.replaceChildren(
      ...btns,
      h('div', { class: 'login-sso-note' },
        Icon.server(), h('span', null, 'Authenticates on '), h('span', { class: 'mono' }, cur)));
  }

  // Keep the primary/secondary swap, Connect enablement, and target row in sync
  // with the field values — updated in place so focus/caret are preserved.
  function update() {
    const has = hasCreds();
    connectBtn.classList.toggle('btn-primary', has);
    connectBtn.classList.toggle('btn-ghost', !has);
    connectBtn.disabled = !has || !!busy;
    for (const b of ssoBtns) {
      b.classList.toggle('btn-primary', !has);
      b.classList.toggle('btn-ghost', has);
    }
    targetHostEl.textContent = hostInput.value.trim() || cur;
    targetAsEl.textContent = has ? 'as ' + userInput.value.trim() : 'via SSO';
  }

  function onCredsKey(e) { if (e.key === 'Enter' && hasCreds()) doConnect(); }

  async function doConnect() {
    if (busy || !hasCreds()) return;
    busy = 'creds';
    connectBtn.disabled = true;
    connectBtn.replaceChildren(h('span', null, 'Connecting…'));
    try {
      await app.actions.connect({ username: userInput.value, password: passInput.value, host: hostInput.value });
      // success → connect() renders the workbench, replacing this screen.
    } catch (err) {
      busy = null;
      app.showLogin(String((err && err.message) || err));
    }
  }

  async function doSso(idpId, btn) {
    if (busy) return;
    busy = 'sso';
    btn.disabled = true;
    btn.replaceChildren(h('span', null, 'Redirecting…'));
    try {
      await app.actions.login(idpId);
    } catch (err) {
      busy = null;
      app.showLogin(String((err && err.message) || err));
    }
  }
}
