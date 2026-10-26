#!/usr/bin/env python3
"""Loopback-only static benchmark server with cross-origin isolation."""
import argparse
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--corpus", type=Path)
    parser.add_argument("--flashraw", type=Path)
    args = parser.parse_args()
    mappings = {"/": Path(__file__).resolve().parent}
    if args.corpus:
        mappings["/corpus/"] = args.corpus.resolve()
    if args.flashraw:
        mappings["/flashraw/"] = args.flashraw.resolve()

    class Handler(SimpleHTTPRequestHandler):
        def translate_path(self, path):
            path = unquote(urlsplit(path).path)
            for prefix, folder in sorted(mappings.items(), key=lambda item: -len(item[0])):
                if path.startswith(prefix):
                    result = (folder / path[len(prefix):]).resolve()
                    return str(result if result.is_relative_to(folder) else folder / "__forbidden__")
            return "/nonexistent"

        def end_headers(self):
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def log_message(self, format, *values):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(json.dumps({"port": server.server_port}), flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
