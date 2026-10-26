export async function createRawstride({threads = "auto"} = {}) {
  if (threads === "auto") threads = crossOriginIsolated ? Math.min(8, navigator.hardwareConcurrency || 1) : 1;
  if (![1, 2, 3, 4, 5, 6, 7, 8].includes(threads)) throw new RangeError("threads must be 1 through 8");
  if (threads > 1 && !crossOriginIsolated) throw new Error("Multiple threads require COOP: same-origin and COEP: require-corp");
  const worker = new Worker(new URL("./rawstride-worker.js", import.meta.url), {type:"module"});
  const pending = new Map();
  let serial = 0, closed = false;
  function fail(error) {
    closed = true;
    for (const item of pending.values()) item.reject(error);
    pending.clear();
    worker.terminate();
  }
  worker.onmessage = ({data}) => {
    const item = pending.get(data.id);
    if (!item) return;
    pending.delete(data.id);
    if (data.error) item.reject(new Error(data.error));
    else item.resolve(data.result);
  };
  worker.onerror = event => fail(new Error(event.message));
  const call = (action, options, transfer = []) => new Promise((resolve, reject) => {
    if (closed) {reject(new Error("Decoder is closed")); return;}
    const id = ++serial;
    pending.set(id, {resolve, reject});
    try {worker.postMessage({id, action, options}, transfer);}
    catch (error) {pending.delete(id); reject(error);}
  });
  try {await call("init", {threads});}
  catch (error) {fail(error); throw error;}
  return {
    threads,
    async decode(input, {transfer = false} = {}) {
      const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
      if (!(bytes instanceof Uint8Array) || !(bytes.buffer instanceof ArrayBuffer))
        throw new TypeError("Expected an ArrayBuffer or Uint8Array backed by an ArrayBuffer");
      return call("decode", {bytes}, transfer ? [bytes.buffer] : []);
    },
    close() {fail(new Error("Decoder is closed"));}
  };
}
