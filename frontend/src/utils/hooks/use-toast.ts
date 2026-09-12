import { useState, useEffect } from "react";
import { toast, type ToastPosition } from "../toast";
import type { ToastItem } from "../../shared/components/atoms/toast";

export type { ToastPosition };

/**
 * @description Hook to access and manipulate active toasts in React components.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(toast.getToasts());
  const [position, setPosition] = useState<ToastPosition>(toast.getPosition());

  useEffect(() => {
    const unsubToasts = toast.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });
    const unsubPosition = toast.subscribePosition((newPos) => {
      setPosition(newPos);
    });
    return () => {
      unsubToasts();
      unsubPosition();
    };
  }, []);

  return {
    toasts,
    position,
    setPosition: (pos: ToastPosition) => toast.setPosition(pos),
    toast,
    dismiss: (id?: string) => toast.dismiss(id),
    update: (id: string, updates: Partial<Omit<ToastItem, "id">>) => toast.update(id, updates),
    show: toast.show.bind(toast),
    success: toast.success.bind(toast),
    error: toast.error.bind(toast),
    warning: toast.warning.bind(toast),
    info: toast.info.bind(toast),
  };
}
