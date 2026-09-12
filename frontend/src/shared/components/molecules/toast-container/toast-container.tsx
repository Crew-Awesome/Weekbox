import React from "react";
import ReactDOM from "react-dom";
import { Toast } from "../../atoms/toast";
import { useToast, type ToastPosition } from "../../../../utils/hooks/use-toast";

export type { ToastPosition };

export interface ToastContainerProps {
  position?: ToastPosition;
}

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right": "top-6 right-6 items-end",
  "top-left": "top-6 left-6 items-start",
  "bottom-right": "bottom-6 right-6 items-end",
  "bottom-left": "bottom-6 left-6 items-start",
  "top-center": "top-6 left-1/2 -translate-x-1/2 items-center",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2 items-center",
};

/**
 * @description Molecule: ToastContainer.
 * Fixed viewport container that manages and renders active toasts via React Portal.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  position: propPosition,
}) => {
  const { toasts, dismiss, position: globalPosition } = useToast();

  if (typeof document === "undefined" || toasts.length === 0) {
    return null;
  }

  const currentPos = propPosition || globalPosition || "top-right";
  const positionClass = POSITION_CLASSES[currentPos] || POSITION_CLASSES["top-right"];

  return ReactDOM.createPortal(
    <div
      className={`fixed z-[9999] pointer-events-none flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0 transition-all duration-200 ease-out ${positionClass}`}
      aria-live="polite"
      role="region"
      aria-label="Notificaciones del sistema"
    >
      {toasts.map((item) => (
        <Toast key={item.id} {...item} onClose={dismiss} />
      ))}
    </div>,
    document.body
  );
};
