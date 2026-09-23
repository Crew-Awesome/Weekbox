
class NeutralinoExtension {
  constructor(debug = false) {
    this.version = "1.0.4";
    this.debug = debug;
    this.pendingRequests = new Map();

    this.debugTermColors = true;
    this.debugTermColorCALL = "\x1b[91m";
    this.debugTermColorOUT = "\x1b[33m";

    let port = null;
    let token = null;
    let connectToken = "";
    let idExtension = null;

    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (arg.startsWith("--nl-port=")) {
        port = arg.split("=")[1];
      } else if (arg.startsWith("--nl-token=")) {
        token = arg.split("=")[1];
      } else if (arg.startsWith("--nl-extension-id=")) {
        idExtension = arg.split("=")[1];
      } else if (arg.startsWith("--nl-connect-token=")) {
        connectToken = arg.split("=")[1];
      }
    }

    if (port && token && idExtension) {
      this.port = port;
      this.token = token;
      this.connectToken = connectToken;
      this.idExtension = idExtension;
      this.urlSocket = connectToken
        ? `ws://127.0.0.1:${this.port}?extensionId=${this.idExtension}&connectToken=${this.connectToken}`
        : `ws://127.0.0.1:${this.port}?extensionId=${this.idExtension}`;
    } else {
      try {
        let fs = require("fs");
        let d = fs.readFileSync(0, "utf-8");
        let conf = JSON.parse(d);

        this.port = conf.nlPort;
        this.token = conf.nlToken;
        this.connectToken = conf.nlConnectToken || "";
        this.idExtension = conf.nlExtensionId;
        this.urlSocket = `ws://127.0.0.1:${this.port}?extensionId=${this.idExtension}&connectToken=${this.connectToken}`;
      } catch (err) {
        console.warn("Could not read extension config from stdin:", err?.message || err);
      }
    }

    this.socket = undefined;

    this.termOnWindowClose = true;

    this.debugLog(`${this.idExtension} running on port ${this.port}`);
  }

  sendMessage(event, data = null) {

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

  run(onReceiveMessage) {
    const WebSocket = require("ws");
    this.socket = new WebSocket(this.urlSocket);
    let self = this;

    this.socket.on("open", () => {
      console.log("WebSocket ready");
      console.log(`Running on port ${self.port}`);
    });

    this.socket.on("message", (data) => {
      let msg = data.toString("utf-8");

      try {
        msg = JSON.parse(msg);
      } catch (e) {}

      if (msg.id && self.pendingRequests.has(msg.id)) {
        self.debugLog(`API RESPONSE: ${JSON.stringify(msg)}`, "in");
        const { resolve, reject } = self.pendingRequests.get(msg.id);
        self.pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(msg.error);
        } else {
          resolve(msg);
        }
        return;
      }

      try {
        if (self.termOnWindowClose) {
          if (msg.event === "windowClose" || msg.event === "appClose") {
            try {
              process.exit(0);
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      self.debugLog(msg, "in");
      onReceiveMessage(msg);
    });

    this.socket.on("close", (code, reason) => {
      console.log(`WebSocket closed: ${code} - ${reason}`);
      process.exit(0);
    });

    this.socket.on("error", (error) => {
      console.error(`WebSocket Error: ${error}`);
    });
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
