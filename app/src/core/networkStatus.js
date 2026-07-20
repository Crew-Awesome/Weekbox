class NetworkStatus extends EventTarget {
  constructor() {
    super();
    this.online = typeof navigator === "undefined" ? true : navigator.onLine;
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    window.addEventListener("online", () => this.setOnline(true));
    window.addEventListener("offline", () => this.setOnline(false));
  }

  setOnline(online) {
    const next = Boolean(online);
    if (this.online === next) return;
    this.online = next;
    this.dispatchEvent(new CustomEvent("change", { detail: { online: next } }));
  }
}

export const networkStatus = new NetworkStatus();
