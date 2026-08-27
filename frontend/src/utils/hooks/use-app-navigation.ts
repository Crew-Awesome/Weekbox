import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook to handle unified application navigation.
 * Uses react-router-dom to change the URL and automatically resets the scroll
 * position of the main layout container.
 */
export const useAppNavigation = () => {
  const navigate = useNavigate();

  return useCallback(
    (view: string) => {
      navigate(`/${view}`);
      document
        .getElementById("main-scroll-container")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate],
  );
};
