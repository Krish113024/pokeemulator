#!/usr/bin/env python3
"""Static server for EmberBoy that sets the cross-origin isolation headers the
mGBA WebAssembly core requires (it uses threads / SharedArrayBuffer).

    python3 serve.py [port]     # default port 8000

Then open http://localhost:<port>
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable crossOriginIsolated so SharedArrayBuffer / threads work.
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

    def guess_type(self, path):
        if path.endswith(".wasm"):
            return "application/wasm"
        if path.endswith(".js") or path.endswith(".mjs"):
            return "text/javascript"
        return super().guess_type(path)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"EmberBoy serving on http://localhost:{port}  (COOP/COEP enabled)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
