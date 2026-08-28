import { useEffect } from "react";
import Core from "../../core";

/**
 * Hook to show the native desktop window.
 * It waits for the platform to be ready before firing the window show command.
 * Use this in components that act as the entry point or loading screen 
 * to reveal the app gracefully
 */
export const useShowWindow = () => {
  useEffect(() => {
    if (Core.platform.isReady) {
      Core.window.show().catch(console.error);
    } else {
      const unsubscribe = Core.platform.onEvent("ready", () => {
        Core.window.show().catch(console.error);
        unsubscribe();
      });
    }
  }, []);
};
