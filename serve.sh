#!/usr/bin/env bash
# Local static server that mirrors GitHub Pages base path: /ai-game-lab/
set -euo pipefail
cd "$(dirname "$0")"

ROOT_DIR="$(pwd)"
PORT="${PORT:-8080}"
HOST="${HOST:-127.0.0.1}"

# Boot behavior: rebuild + re-embed games automatically before serving.
# Set SKIP_SYNC=1 to skip rebuilding.
if [ "${SKIP_SYNC:-0}" != "1" ]; then
  if command -v npm >/dev/null 2>&1 && [ -f "./sync-games.sh" ]; then
    bash "./sync-games.sh" || echo "[serve] sync-games.sh reported an error; continuing" >&2
  else
    echo "[serve] skipping game sync (npm or sync-games.sh missing)" >&2
  fi
fi

BASE_URL="http://${HOST}:${PORT}/ai-game-lab/"
echo "[serve] AI Game Lab → ${BASE_URL}"
echo "[serve] Ctrl+C to stop"

# Auto-open the site (set NO_OPEN=1 to disable)
if [ "${NO_OPEN:-0}" != "1" ] && command -v xdg-open >/dev/null 2>&1; then
  (sleep 0.4; xdg-open "$BASE_URL" >/dev/null 2>&1 || true) &
fi

export AIGL_ROOT="$ROOT_DIR"
export AIGL_HOST="$HOST"
export AIGL_PORT="$PORT"

exec python3 - <<'PY'
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.abspath(os.environ["AIGL_ROOT"])
HOST = os.environ.get("AIGL_HOST", "127.0.0.1")
PORT = int(os.environ.get("AIGL_PORT", "8080"))
PREFIX = "/ai-game-lab"


class LabHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        # Root → hub (same convenience GH Pages project sites don't need, but local does)
        if path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", PREFIX + "/")
            self.end_headers()
            return

        # Strip the Pages base prefix so files resolve from repo root
        if path == PREFIX or path.startswith(PREFIX + "/"):
            rel = path[len(PREFIX):] or "/"
            self.path = rel + (("?" + parsed.query) if parsed.query else "")
            return super().do_GET()

        # Anything else outside the base path
        self.send_error(404, "Not found (use %s/)" % PREFIX)

    def do_HEAD(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", PREFIX + "/")
            self.end_headers()
            return
        if path == PREFIX or path.startswith(PREFIX + "/"):
            rel = path[len(PREFIX):] or "/"
            self.path = rel + (("?" + parsed.query) if parsed.query else "")
            return super().do_HEAD()
        self.send_error(404, "Not found")

    def end_headers(self):
        # Avoid sticky local caches while iterating on hub shell
        if self.path.endswith((".html", "/")) or "styles.css" in self.path or "script.js" in self.path:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()


server = ThreadingHTTPServer((HOST, PORT), LabHandler)
print("[serve] listening on http://%s:%s%s/" % (HOST, PORT, PREFIX), flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\n[serve] stopped")
PY
