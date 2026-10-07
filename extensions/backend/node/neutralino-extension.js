
class NeutralinoExtension {
  constructor(debug = false) {
    this.version = "1.0.4";
    this.debug = debug;
    this.pendingRequests = new Map();

    this.debugTermColors = true;
    this.debugTermColorCALL = "\x1b[91m";
    this.debugTermColorOUT = "\x1b[33m";

    const path = require("path");
    const fs = require("fs");

    this.port = null;
    this.token = null;
    this.connectToken = "";
    this.idExtension = "extNode";
    this.urlSocket = "";
    this.socket = undefined;
    this.termOnWindowClose = true;

    this.resolveAuthSync();
  }

  resolveAuthSync() {
    const path = require("path");
    const fs = require("fs");

    let port = process.env.NL_PORT || null;
    let token = process.env.NL_TOKEN || null;
    let connectToken = process.env.NL_CONNECT_TOKEN || "";
    let idExtension = process.env.NL_EXTENSION_ID || "extNode";

    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (arg.startsWith("--nl-port=")) {
        port = arg.split("=")[1];
      } else if (arg === "--nl-port" && i + 1 < process.argv.length) {
        port = process.argv[++i];
      } else if (arg.startsWith("--nl-token=")) {
        token = arg.split("=")[1];
      } else if (arg === "--nl-token" && i + 1 < process.argv.length) {
        token = process.argv[++i];
      } else if (arg.startsWith("--nl-extension-id=")) {
        idExtension = arg.split("=")[1];
      } else if (arg === "--nl-extension-id" && i + 1 < process.argv.length) {
        idExtension = process.argv[++i];
      } else if (arg.startsWith("--nl-connect-token=")) {
        connectToken = arg.split("=")[1];
      } else if (arg === "--nl-connect-token" && i + 1 < process.argv.length) {
        connectToken = process.argv[++i];
      }
    }

    if (!port || !token) {
      const searchDirs = [
        process.cwd(),
        path.resolve(__dirname, "../../.."),
        path.resolve(__dirname, "../../../.."),
        process.env.NL_PATH || "",
      ].filter(Boolean);

      for (const dir of searchDirs) {
        const authPath = path.resolve(dir, ".tmp/auth_info.json");
        try {
          if (fs.existsSync(authPath)) {
            const raw = fs.readFileSync(authPath, "utf-8");
            const auth = JSON.parse(raw);
            if (auth.port && (auth.accessToken || auth.token)) {
              port = port || String(auth.port);
              token = token || auth.accessToken || auth.token;
              connectToken = connectToken || auth.connectToken || "";
              break;
            }
          }
        } catch {}
      }
    }

    if (port && token) {
      this.port = port;
      this.token = token;
      this.connectToken = connectToken || "";
      this.idExtension = idExtension || "extNode";
      this.urlSocket = this.connectToken
        ? `ws://127.0.0.1:${this.port}?extensionId=${this.idExtension}&connectToken=${this.connectToken}`
        : `ws://127.0.0.1:${this.port}?extensionId=${this.idExtension}`;
      return true;
    }
    return false;
  }

  async ensureAuth() {
    if (this.resolveAuthSync()) return true;

    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (this.resolveAuthSync()) return true;
    }
    return false;
  }

  sendMessage(event, data = null) {
    if (!this.socket || this.socket.readyState !== 1) {
      return;
    }

    let d = {
      id: crypto.randomUUID(),
      method: "app.broadcast",
      accessToken: this.token,
      data: {
        event: event,
        data: data,
      },
    };
    let msg = JSON.stringify(d);
    this.socket.send(msg);
    this.debugLog(`${msg}`, "out");
  }

  callApi(method, data = {}, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== 1) {
        return reject(new Error("WebSocket is not connected"));
      }

      let id = crypto.randomUUID();
      let d = {
        id: id,
        method: method,
        accessToken: this.token,
      };

      if (data && Object.keys(data).length > 0) {
        d.data = data;
      }

      this.pendingRequests.set(id, { resolve, reject });

      let msg = JSON.stringify(d);
      this.socket.send(msg);
      this.debugLog(`API CALL: ${msg}`, "out");
    });
  }

  async run(onReceiveMessage) {
    try { require("fs").appendFileSync(require("path").join(require("os").homedir(), "weekbox_ext_debug.log"), "Extension run() called.\n"); } catch(e){}
    const hasAuth = await this.ensureAuth();
    if (!hasAuth) {
      try { require("fs").appendFileSync(require("path").join(require("os").homedir(), "weekbox_ext_debug.log"), "Could not obtain port and token for connection.\n"); } catch(e){}
      console.error("[NeutralinoExtension] Could not obtain port and token for connection.");
      return;
    }
    try { require("fs").appendFileSync(require("path").join(require("os").homedir(), "weekbox_ext_debug.log"), "Auth obtained. Port: " + this.port + "\n"); } catch(e){}

    const WebSocket = require("ws");
    let hasOpened = false;
    let retryCount = 0;

    const connect = () => {
      const socket = new WebSocket(this.urlSocket);
      this.socket = socket;

      socket.on("open", () => {
        hasOpened = true;
        try { require("fs").appendFileSync(require("path").join(require("os").homedir(), "weekbox_ext_debug.log"), "WS OPENED on port " + this.port + "\n"); } catch(e){}
        console.log(`[NeutralinoExtension] WebSocket ready on port ${this.port}`);
      });

      socket.on("message", (data) => {
        let msg = data.toString("utf-8");
        try { require("fs").appendFileSync(require("path").join(require("os").homedir(), "weekbox_ext_debug.log"), "WS RECV: " + msg + "\n"); } catch(e){}

        try {
          msg = JSON.parse(msg);
        } catch (e) {}

        if (msg.id && this.pendingRequests.has(msg.id)) {
          this.debugLog(`API RESPONSE: ${JSON.stringify(msg)}`, "in");
          const { resolve, reject } = this.pendingRequests.get(msg.id);
          this.pendingRequests.delete(msg.id);
          if (msg.error) {
            reject(msg.error);
          } else {
            resolve(msg);
          }
          return;
        }

        try {
          if (this.termOnWindowClose) {
            if (msg.event === "windowClose" || msg.event === "appClose") {
              try {
                process.exit(0);
              } catch (e) {}
              return;
            }
          }
        } catch (e) {}

        this.debugLog(msg, "in");
        onReceiveMessage(msg);
      });

      socket.on("close", (code, reason) => {
        if (!hasOpened && retryCount < 40) {
          retryCount++;
          setTimeout(connect, 300);
          return;
        }
        console.log(`WebSocket closed: ${code} - ${reason}`);
        process.exit(0);
      });

      socket.on("error", (error) => {
        if (!hasOpened && retryCount < 40) {
          return;
        }
        console.error(`WebSocket Error: ${error?.message || error}`);
      });
    };

    connect();
  }
  isEvent(e, eventName) {

    if ("event" in e && e.event === eventName) {
      return true;
    }
    return false;
  }

  debugLog(msg, tag = "info") {

    let cIN = "";
    let cCALL = "";
    let cOUT = "";
    let cRST = "";

    if (this.debugTermColors) {
      cIN = this.debugTermColorIN;
      cCALL = this.debugTermColorCALL;
      cOUT = this.debugTermColorOUT;
      cRST = "\x1b[0m";
    }

    if (!this.debug) {
      return;
    }

    try {
      msg = JSON.stringify(msg);
    } catch (e) {}

    if (tag === "in") {
      if (msg.includes("runNode")) {
        console.log(`${cCALL}IN:  ${msg}${cRST}`);
      } else {
        console.log(`${cIN}IN:  ${msg}${cRST}`);
      }
      return;
    }
    if (tag === "out") {
      console.log(`${cOUT}OUT: ${msg}${cRST}`);
      return;
    }
  }
}

module.exports = NeutralinoExtension;
