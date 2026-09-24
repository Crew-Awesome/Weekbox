import { useEffect, useRef } from "react";
import { create } from "zustand";

export interface NetworkState {
  isOnline: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

interface NetworkStoreState extends NetworkState {
  setOnline: (online: boolean) => void;
  checkConnectivity: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkStoreState>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  effectiveType:
    (typeof navigator !== "undefined" && (navigator as any).connection?.effectiveType) || "4g",
  downlink:
    (typeof navigator !== "undefined" && (navigator as any).connection?.downlink) || 10,
  rtt:
    (typeof navigator !== "undefined" && (navigator as any).connection?.rtt) || 50,
  setOnline: (online: boolean) => {
    if (get().isOnline !== online) {
      set({ isOnline: online });
    }
  },
  checkConnectivity: async () => {
    // If navigator explicitly reports offline, trust it immediately
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isOnline: false });
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Probe GitHub raw with GET and no-cors. WebKit/Safari allows GET in no-cors mode seamlessly.
      await fetch(
        "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json",
        {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      set({ isOnline: true });
      return true;
    } catch {
      // Fallback probe (Cloudflare CDN)
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 1500);
        await fetch("https://cloudflare.com/cdn-cgi/trace", {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
          signal: controller2.signal,
        });
        clearTimeout(timeoutId2);
        set({ isOnline: true });
        return true;
      } catch {
        // If navigator explicitly reports online, do not force offline on flaky opaque probes
        if (typeof navigator !== "undefined" && navigator.onLine) {
          set({ isOnline: true });
          return true;
        }
        set({ isOnline: false });
        return false;
      }
    }
  },
}));

export const checkNetworkConnectivity = () => useNetworkStore.getState().checkConnectivity();
export const setNetworkOnline = (online: boolean) => useNetworkStore.getState().setOnline(online);

if (typeof window !== "undefined") {
  const handleOnline = () => {
    useNetworkStore.getState().checkConnectivity();
  };
  const handleOffline = () => {
    useNetworkStore.getState().setOnline(false);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  const conn = (navigator as any).connection;
  if (conn) {
    conn.addEventListener("change", () => {
      const c = (navigator as any).connection;
      useNetworkStore.setState({
        effectiveType: c?.effectiveType || "4g",
        downlink: c?.downlink || 10,
        rtt: c?.rtt || 50,
      });
      useNetworkStore.getState().checkConnectivity();
    });
  }

  window.addEventListener("focus", () => {
    useNetworkStore.getState().checkConnectivity();
  });
}

/**
 * @description Hook to monitor network status and connection speed.
 * Uses a centralized store with active probe verification.
 */
export function useNetwork(): NetworkState {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const effectiveType = useNetworkStore((s) => s.effectiveType);
  const downlink = useNetworkStore((s) => s.downlink);
  const rtt = useNetworkStore((s) => s.rtt);

  return {
    isOnline,
    effectiveType,
    downlink,
    rtt,
  };
}

/**
 * @description Helper hook that automatically triggers a callback when the internet connection is restored.
 * @param {() => void} onReconnect - The function to call when the network is restored.
 */
export function useNetworkRecovery(onReconnect: () => void) {
  const { isOnline } = useNetwork();
  const wasOffline = useRef(!isOnline);

  useEffect(() => {
    if (!wasOffline.current && !isOnline) {
      wasOffline.current = true;
    } else if (wasOffline.current && isOnline) {
      wasOffline.current = false;
      onReconnect();
    }
  }, [isOnline, onReconnect]);
}
