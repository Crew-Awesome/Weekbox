import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: React.ReactNode;
  duration?: number;
  progress?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastProps extends ToastItem {
  onClose: (id: string) => void;
}

const TYPE_CONFIG = {
  info: {
    icon: Info,
    borderColor: "border-[var(--wb-toast-info-border)]",
    bgColor: "bg-[var(--wb-toast-info-bg)]",
    accentBg: "bg-[var(--wb-toast-info-accent)]",
    iconColor: "text-[var(--wb-toast-info-icon)]",
  },
  success: {
    icon: CheckCircle2,
    borderColor: "border-[var(--wb-toast-success-border)]",
    bgColor: "bg-[var(--wb-toast-success-bg)]",
    accentBg: "bg-[var(--wb-toast-success-accent)]",
    iconColor: "text-[var(--wb-toast-success-icon)]",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-[var(--wb-toast-warning-border)]",
    bgColor: "bg-[var(--wb-toast-warning-bg)]",
    accentBg: "bg-[var(--wb-toast-warning-accent)]",
    iconColor: "text-[var(--wb-toast-warning-icon)]",
  },
  error: {
    icon: AlertCircle,
    borderColor: "border-[var(--wb-toast-error-border)]",
    bgColor: "bg-[var(--wb-toast-error-bg)]",
    accentBg: "bg-[var(--wb-toast-error-accent)]",
    iconColor: "text-[var(--wb-toast-error-icon)]",
  },
};

/**
 * @description Atom: Toast.
 * Represents an individual toast alert with Weekbox styling, icon, progress indicator, and action button.
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  type = "info",
  title,
  message,
  duration = 4000,
  progress: taskProgress,
  action,
  onClose,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef<number>(duration);

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const IconComponent = config.icon;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 200);
  };

  useEffect(() => {
    if (!duration || duration <= 0) return;

    const intervalStep = 25;
    const interval = setInterval(() => {
      if (!isPaused) {
        remainingTimeRef.current -= intervalStep;
        const pct = Math.max(0, (remainingTimeRef.current / duration) * 100);
        setProgress(pct);

        if (remainingTimeRef.current <= 0) {
          clearInterval(interval);
          handleClose();
        }
      }
    }, intervalStep);

    return () => clearInterval(interval);
  }, [duration, isPaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full min-w-[280px] sm:min-w-[340px] overflow-hidden rounded-xl border backdrop-blur-md p-4 shadow-2xl transition-all duration-200 ease-out select-none ${
        config.bgColor
      } ${config.borderColor} ${
        !isMounted
          ? "opacity-0 -translate-y-2 scale-95"
          : isExiting
          ? "opacity-0 scale-95 translate-x-4"
          : "opacity-100 scale-100 translate-y-0 translate-x-0"
      }`}
      role="alert"
    >

      <div className="flex items-start gap-3.5">
        <div className={`mt-0.5 shrink-0 ${config.iconColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          {title && (
            <h4 className="text-sm font-semibold text-[var(--wb-text-main)] mb-0.5 tracking-wide">
              {title}
            </h4>
          )}
          <div className="text-xs text-[var(--wb-text-muted)] leading-relaxed break-words font-medium">
            {message}
          </div>

          {action && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  action.onClick();
                  handleClose();
                }}
                className="text-xs font-semibold text-[var(--wb-primary)] hover:underline focus:outline-none"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-lg p-1 text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] hover:bg-white/10 transition-colors focus:outline-none"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {typeof taskProgress === "number" && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ease-out ${config.accentBg}`}
            style={{ width: `${Math.min(100, Math.max(0, taskProgress))}%` }}
          />
        </div>
      )}

      {typeof taskProgress !== "number" && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${config.accentBg}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
