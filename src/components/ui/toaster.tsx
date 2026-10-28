import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { API_ROUTES } from "@/routes";

export function Toaster() {
  const { toasts } = useToast();
  const [position, setPosition] = useState<"top-right" | "top-left" | "bottom-right" | "bottom-left">("bottom-right");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(API_ROUTES.SETTINGS_GENERAL_PUBLIC, { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; settings?: { alertPosition?: string } };
        if (!res.ok || !data.ok || !data.settings?.alertPosition) return;
        const p = String(data.settings.alertPosition);
        if (p === "top-right" || p === "top-left" || p === "bottom-left" || p === "bottom-right") setPosition(p);
      } catch {
        // keep default
      }
    };
    void run();
  }, []);

  const viewportClassName =
    position === "top-right"
      ? "top-0 right-0 left-auto bottom-auto sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto"
      : position === "top-left"
        ? "top-0 left-0 right-auto bottom-auto sm:top-0 sm:left-0 sm:right-auto sm:bottom-auto"
        : position === "bottom-left"
          ? "bottom-0 left-0 right-auto top-auto sm:bottom-0 sm:left-0 sm:right-auto sm:top-auto"
          : "bottom-0 right-0 left-auto top-auto sm:bottom-0 sm:right-0 sm:left-auto sm:top-auto";

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className={viewportClassName} />
    </ToastProvider>
  );
}
