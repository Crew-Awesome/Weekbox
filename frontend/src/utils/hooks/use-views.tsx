import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home } from "../../features/home/home";

export type ViewType = "home" | "library" | "engines" | string;

/**
 * @description Hook especializado en manejar la navegación principal
 * y la vista activa actual en el Layout sincronizada con la URL.
 */
export const useViews = (defaultView: ViewType = "home") => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extraemos la vista desde el path (/home, /library). Si es "/", usamos defaultView.
  const pathView = location.pathname.substring(1) || defaultView;
  const currentView = pathView;

  const [homeKey, setHomeKey] = useState(0);

  const handleSetView = React.useCallback(
    (view: ViewType) => {
      if (view === "home" && currentView === "home") {
        setHomeKey((prev) => prev + 1);
        navigate(`/${view}`);
        document
          .getElementById("main-scroll-container")
          ?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate(`/${view}`);
        document
          .getElementById("main-scroll-container")
          ?.scrollTo({ top: 0, behavior: "instant" });
      }
    },
    [currentView, navigate],
  );

  const renderView = (children?: React.ReactNode) => {
    if (children) return <>{children}</>;

    switch (currentView) {
      case "home":
        return <Home key={`home-${homeKey}`} />;
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
        return <Home key={`home-${homeKey}`} />;
    }
  };

  return {
    currentView,
    setCurrentView: handleSetView,
    renderView,
  };
};
