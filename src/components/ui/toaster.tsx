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
      playSound("alert-sound", false);
    } else {
      playSound("toast-sound", false);
    }
  }, []); // run only once

  return (
    <Toast key={id} variant={variant} {...props}>
      <div className="flex items-start gap-3 w-full">

        {/* App Icon */}
        <img
          src="/UsersAvatar.jpg"
          alt="Medrae"
          className="w-10 h-10 rounded-xl border border-border object-cover"
        />

        {/* Text Section */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold opacity-70">
            Medrae
          </span>

          {title && <ToastTitle>{title}</ToastTitle>}
          {description && (
            <ToastDescription>{description}</ToastDescription>
          )}
        </div>
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
      <ToastViewport
        className="
    fixed z-[100] flex w-full p-4
    top-0 left-0 flex-col-reverse
    sm:top-auto sm:bottom-0 sm:right-0 sm:left-auto sm:w-auto sm:max-w-[420px] sm:flex-col
  "
      />
    </ToastProvider>
  );
}
