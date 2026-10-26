# Rawstride browser

Decode local camera RAW files in your browser.

## Run

From the repository root:

```bash
python3 web/serve.py
```

Open `http://127.0.0.1:8080/`, choose a file and select Decode. Files stay in
your browser. The result shows dimensions and elapsed processing time.

The download contains the full sensor plane as little-endian unsigned 16-bit
samples, with dimensions shown in the result.

## Host

Keep the supplied file layout and serve `.wasm` as `application/wasm`.
Use HTTPS or localhost. To enable the full thread selection, send:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The included server sets these headers. Tested in Chromium 138.

Third-party notices are in `../notices/`. Corresponding LibRaw sources are
provided separately as `rawstride-libraw-source.zip`.
