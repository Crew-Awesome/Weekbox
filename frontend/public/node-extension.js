class NodeExtension {
  constructor(debug) {
    this.debug = debug;
    this.pending = new Map();
    this.onResponse = (event) => {
      const response = event?.detail || {};
      const pending = this.pending.get(response.requestId);
      if (!pending) return;
      this.pending.delete(response.requestId);
      clearTimeout(pending.timeout);
      if (response.ok) pending.resolve(response.data);
      else
        pending.reject(
          new Error(response.error?.message || "Backend request failed"),
        );
    };
    window.Neutralino?.events?.on("backend:response", this.onResponse);
  }
  run(func, param) {
    let data = { function: func, parameter: param };
    if (this.debug) console.log("OUT: ", JSON.stringify(data));

    window.Neutralino.extensions.dispatch("extNode", "runNode", data);
  }
  call(operation, params, timeoutMs = 300000, signal) {
    const requestId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Backend request timed out: ${operation}`));
      }, timeoutMs);

      const abortHandler = () => {
        this.run("backend.cancel", { requestId });
        this.pending.delete(requestId);
        clearTimeout(timeout);
        reject(new Error("Cancelled"));
      };

      if (signal) {
        if (signal.aborted) {
          return abortHandler();
        }
        signal.addEventListener("abort", abortHandler, { once: true });
      }

      this.pending.set(requestId, { resolve, reject, timeout });
      this.run("backend.call", { requestId, operation, params });
    });
  }
  stop() {
    window.Neutralino.extensions.dispatch("extNode", "stopNode");
  }
}
window.NodeExtension = NodeExtension;
