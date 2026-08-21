import { useState, useEffect, useRef } from "react";

export interface NetworkState {
  isOnline: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

/**
 * @description Hook to monitor network status and connection speed.
 * Uses the Network Information API available in modern browsers (and Chromium webviews).
 */
export function useNetwork(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    effectiveType: (navigator as any).connection?.effectiveType || "4g",
    downlink: (navigator as any).connection?.downlink || 10,
    rtt: (navigator as any).connection?.rtt || 50,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const conn = (navigator as any).connection;
      setNetworkState({
        isOnline: navigator.onLine,
        effectiveType: conn?.effectiveType || "4g",
        downlink: conn?.downlink || 10,
        rtt: conn?.rtt || 50,
      });
    };

    window.addEventListener("online", updateNetworkInfo);
    window.addEventListener("offline", updateNetworkInfo);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener("change", updateNetworkInfo);
    }

    return () => {
      window.removeEventListener("online", updateNetworkInfo);
      window.removeEventListener("offline", updateNetworkInfo);
      if (conn) {
        conn.removeEventListener("change", updateNetworkInfo);
      }
    };
  }, []);

  return networkState;
}

/**
 * @description Helper hook that automatically triggers a callback when the internet connection is restored.
 * Useful for auto-reloading failed requests.
 * @param {() => void} onReconnect - The function to call when the network is restored.
 */
export function useNetworkRecovery(onReconnect: () => void) {
  const { isOnline } = useNetwork();
  const wasOffline = useRef(!isOnline);

  useEffect(() => {
    if (!wasOffline.current && !isOnline) {
      // Network just went down
      wasOffline.current = true;
    } else if (wasOffline.current && isOnline) {
      // Network just came back online!
      wasOffline.current = false;
      onReconnect();
    }
  }, [isOnline, onReconnect]);
}
