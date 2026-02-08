import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { playSound } from "@/lib/soundManager";

// Component for individual toast with sound effect
function ToastWithSound({ id, title, description, action, variant, ...props }: any) {
  useEffect(() => {
    if (variant === "destructive") {
      playSound("start", false); // only plays once on mount
    }
  }, []); // run only once

  return (
    <Toast key={id} variant={variant} {...props}>
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      {action}
      <ToastClose />
    </Toast>
  );
}


export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <ToastWithSound key={toast.id} {...toast} />
      ))}

      <ToastViewport className="fixed !top-auto !bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 w-full max-w-xs sm:max-w-sm" />
    </ToastProvider>
  );
}
