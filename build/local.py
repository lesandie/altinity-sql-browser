#!/usr/bin/env python3
"""Serve the built SQL browser locally as a static page — no ClickHouse here.

The app is a thin client: in *credentials* (username/password) mode its login form
takes a ClickHouse host, and queries go straight from the browser to that host
(cross-origin). So this server only needs to serve the SPA + a
`{"basic_login": true}` config.json on localhost — there's nothing to proxy and no
ClickHouse to run locally.

    npm run local            # build + serve, then open http://localhost:8900/sql

On the login screen, sign in with:
  • Host:  http://localhost:8123   — your ClickHouse HTTP endpoint. Include the
           scheme: a bare host defaults to https://<host>:8443.
  • User / password: your ClickHouse credentials.

The target ClickHouse must allow cross-origin requests — ClickHouse's HTTP
interface sends `Access-Control-Allow-Origin` for requests carrying an `Origin`
header by default, so a stock server works as-is.

Env: PORT (default 8900).
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPA = os.path.join(ROOT, "dist", "sql.html")
PORT = int(os.environ.get("PORT", "8900"))
CONFIG = json.dumps({"basic_login": True, "idps": []}).encode()


class Handler(BaseHTTPRequestHandler):
    def _send(self, body, ctype, code=200):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.endswith("/config.json"):
            self._send(CONFIG, "application/json; charset=utf-8")
            return
        if path.rstrip("/") in ("", "/sql", "/sql.html"):
            try:
                with open(SPA, "rb") as f:
                    html = f.read()
            except FileNotFoundError:
                self._send(b"dist/sql.html missing - run `npm run build`.\n", "text/plain", 500)
                return
            self._send(html, "text/html; charset=utf-8")
            return
        self._send(b"not found\n", "text/plain", 404)

    def log_message(self, *_a):  # keep the console quiet
        pass


def main():
    if not os.path.exists(SPA):
        sys.exit("dist/sql.html not found - run `npm run build` first (or `npm run local`).")
    print(
        f"\n  Altinity SQL Browser - local static server\n"
        f"  ▸ open    http://localhost:{PORT}/sql\n"
        f"  ▸ sign in with your ClickHouse host (e.g. http://localhost:8123) + credentials\n"
        f"  ▸ Ctrl-C to stop\n"
    )
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
