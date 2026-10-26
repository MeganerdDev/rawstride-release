let wasm, threads;
let queue = Promise.resolve();

async function handle({id, action, options}) {
  let input = 0, raw = 0;
  try {
    if (action === "init") {
      threads = options.threads;
      const factory = (await import(threads === 1 ? "./dist/rawstride-single.js" : "./dist/rawstride-threads.js")).default;
      wasm = await factory();
      self.postMessage({id, result:{threads, simd:!!wasm._rawstride_has_wasm_simd()}});
      return;
    }
    if (!wasm) throw new Error("Decoder is not initialized");
    const start = performance.now();
    const bytes = options.bytes;
    input = wasm._malloc(bytes.byteLength);
    if (!input) throw new Error("Input allocation failed");
    wasm.HEAPU8.set(bytes, input);
    raw = wasm._rs_open(input, bytes.byteLength);
    if (!raw) throw new Error("Unsupported or corrupt input: " + wasm._rs_error());
    const parsed = performance.now();
    const status = wasm._rs_unpack(raw, threads);
    if (status) throw new Error("Sensor decode failed: " + status);
    const decoded = performance.now();
    const width = wasm._rs_width(raw), height = wasm._rs_height(raw);
    const pitch = wasm._rs_pitch(raw), offset = wasm._rs_pixels(raw);
    let data;
    if (pitch === width) data = new Uint16Array(wasm.HEAPU16.buffer, offset, width * height).slice();
    else {
      data = new Uint16Array(width * height);
      for (let y=0; y<height; ++y)
        data.set(new Uint16Array(wasm.HEAPU16.buffer, offset + y*pitch*2, width), y*width);
    }
    const ready = performance.now();
    self.postMessage({id, result:{width,height,data,threads,timings:{totalMs:ready-start,openMs:parsed-start,decodeMs:decoded-parsed,outputCopyMs:ready-decoded}}}, [data.buffer]);
  } catch (error) {
    self.postMessage({id, error:String(error.message || error)});
  } finally {
    if (raw) wasm._rs_close(raw);
    if (input) wasm._free(input);
  }
}

self.onmessage = ({data}) => {queue = queue.then(() => handle(data));};
