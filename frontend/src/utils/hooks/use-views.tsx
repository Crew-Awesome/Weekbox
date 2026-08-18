import React, { useState } from "react";
import { Home } from "../../features/home/home";

export type ViewType = "home" | "library" | "engines" | string;

/**
 * @description Hook especializado en manejar la navegación principal
 * y la vista activa actual en el Layout.
 */
export const useViews = (defaultView: ViewType = "home") => {
  const [currentView, setCurrentView] = useState<ViewType>(defaultView);

  const RenderView = ({ children }: { children?: React.ReactNode }) => {
    if (children) return <>{children}</>;

    switch (currentView) {
      case "home":
        return <Home />;
      case "library":
        return (
          <div className="text-white text-center mt-20 text-2xl font-bold">
            Library View (WIP)
          </div>
        );
      case "engines":
        return (
          <div className="text-white text-center mt-20 text-2xl font-bold">
            Engines View (WIP)
          </div>
        );
      default:
        return <Home />;
    }
  };

  return {
    currentView,
    setCurrentView,
    RenderView,
  };
};
