# Configuring the login screen

The sign-in screen supports several deployment shapes at once — SSO, a
ClickHouse username/password, and a picker for connecting to a different
server — so a first-time visitor can see more controls than their deployment
actually needs (#123). Almost all of that is a `config.json` choice, not a
code change: a typical single-cluster, single-IdP deployment can (and should)
configure it down to one button.

## The simplest screen: one SSO button

If the cluster only accepts signed-in users via OAuth (no password-
authenticated ClickHouse users), set `"basic_login": false`. This removes the
entire credentials panel — username, password, the "Advanced — connect to
another server" disclosure, and the live Target row — leaving just the IdP
button(s), the same single-button shape as a typical SSO landing page:

```json
{
  "issuer": "https://accounts.google.com",
  "client_id": "…",
  "basic_login": false
}
```

Without this flag, credentials show **by default** (`basic_login` is opt-out,
not opt-in) because plenty of deployments genuinely need it — a cluster with
real password-authenticated CH users (including a delegated-verifier setup
where some users still authenticate with a plain password, e.g. a `demo` user
kept around for a playground), or one with no OAuth configured at all. Whether
to hide the credentials path is about what the server actually authenticates,
not simply "does it use OAuth" — see README ["Credentials login"](../README.md#credentials-login-username--password)
for the full decision.

## The "Advanced" server picker never appears on a normal hosted deployment

The "Advanced — connect to another server" disclosure and the "Saved
connection" dropdown above it are folded closed / hidden by default, and only
ever populate from two sources:

- a **`?host=` URL param** on the link itself (a deliberate deep link to a
  non-default server), or
- `config.json`'s `hosts` list — which is only ever populated by **local
  development** (`npm run local` reads `~/.clickhouse-client/config.xml` and
  renders it into `hosts`). A hosted, single-cluster deployment built by
  `deploy/install.sh` never sets `hosts`.

So a standard hosted deployment already never shows a server picker to its
users — there's nothing to configure to hide it; it's simply not part of that
deployment mode.

## Multiple IdPs

If `config.json` lists `idps` instead of a single provider, the screen shows
one button per entry, each labelled "Continue with `<label>`" — see README
["Multiple IdPs"](../README.md#multiple-idps) for the shape. This scales the
same single-button-per-choice layout rather than adding new UI.

## Full config reference

This page covers the login-screen-shaping knobs; the complete `config.json`
schema (OAuth shapes, secrets, `audience`, `ch_auth`, per-IdP overrides) is in
the README's ["Configuring OAuth"](../README.md#configuring-oauth) and
["Credentials login"](../README.md#credentials-login-username--password)
sections.
