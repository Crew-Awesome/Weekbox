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

    /*
            sta mierda tiene quue apuntar a extNode para que se conecte y 
            se dispece a la extensiob del backend de node de neu 
        */
    window.Neutralino.extensions.dispatch("extNode", "runNode", data);
  }
  call(operation, params, timeoutMs = 45000) {
    const requestId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Backend request timed out: ${operation}`));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timeout });
      this.run("backend.call", { requestId, operation, params });
    });
  }
  stop() {
    window.Neutralino.extensions.dispatch("extNode", "stopNode");
  }
}
window.NodeExtension = NodeExtension;
