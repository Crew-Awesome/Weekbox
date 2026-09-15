import React from "react";
import ReactDOM from "react-dom";
import { Toast } from "../../atoms/toast";
import { useToast, type ToastPosition } from "../../../utils/hooks/use-toast";
import { Bell, ChevronUp, Minus, X } from "lucide-react";

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
 * Viewport container that manages active toasts, minimization, and summarized display mode.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  position: propPosition,
}) => {
  const {
    toasts,
    dismiss,
    position: globalPosition,
    enabled,
    detailed,
    minimized,
    setMinimized,
  } = useToast();

  if (typeof document === "undefined" || !enabled || toasts.length === 0) {
    return null;
  }

  const currentPos = propPosition || globalPosition || "top-right";
  const positionClass = POSITION_CLASSES[currentPos] || POSITION_CLASSES["top-right"];

  if (minimized) {
    return ReactDOM.createPortal(
      <div
        className={`fixed z-[9999] pointer-events-none flex flex-col w-full max-w-sm px-4 sm:px-0 transition-all duration-200 ease-out ${positionClass}`}
        aria-live="polite"
        role="region"
        aria-label="System Notifications"
      >
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[var(--wb-surface-container-high)]/95 border border-white/10 shadow-2xl backdrop-blur-md text-xs font-semibold text-[var(--wb-on-surface)] select-none animate-in fade-in zoom-in-95 duration-150">
          <div className="w-5 h-5 rounded-full bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] flex items-center justify-center">
            <Bell className="w-3 h-3" />
          </div>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="hover:text-[var(--wb-primary)] transition-colors flex items-center gap-1.5 focus:outline-none"
            title="Expand notifications"
          >
            <span>
              {toasts.length} notification{toasts.length > 1 ? "s" : ""}
            </span>
            <ChevronUp className="w-3.5 h-3.5 opacity-70" />
          </button>
          <div className="w-[1px] h-3.5 bg-white/10" />
          <button
            type="button"
            onClick={() => dismiss()}
            className="p-1 rounded-full text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] hover:bg-white/10 transition-colors focus:outline-none"
            title="Dismiss all notifications"
            aria-label="Dismiss all notifications"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div
      className={`fixed z-[9999] pointer-events-none flex flex-col gap-2.5 w-full max-w-sm px-4 sm:px-0 transition-all duration-200 ease-out ${positionClass}`}
      aria-live="polite"
      role="region"
      aria-label="System Notifications"
    >
      <div className="pointer-events-auto flex items-center justify-end gap-1.5 px-1 select-none">
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 backdrop-blur-sm text-[11px] font-medium text-[var(--wb-text-muted)] hover:text-white transition-colors focus:outline-none"
          title="Minimize all notifications"
        >
          <Minus className="w-3 h-3" />
          <span>Minimize</span>
        </button>
        {toasts.length > 1 && (
          <button
            type="button"
            onClick={() => dismiss()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 backdrop-blur-sm text-[11px] font-medium text-[var(--wb-text-muted)] hover:text-white transition-colors focus:outline-none"
            title="Dismiss all notifications"
          >
            <X className="w-3 h-3" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {toasts.map((item: any) => (
        <Toast
          key={item.id}
          {...item}
          isDetailed={detailed}
          onClose={dismiss}
        />
      ))}
    </div>,
    document.body
  );
};
