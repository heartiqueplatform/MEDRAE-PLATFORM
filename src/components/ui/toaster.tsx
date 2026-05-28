"use client"

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
import { cn } from "@/lib/utils";

function ToastWithSound({ id, title, description, action, variant, ...props }: any) {
  useEffect(() => {
    if (variant === "destructive") {
      playSound("alert-sound", false);
    } else {
      playSound("toast-sound", false);
    }
  }, [variant]);

  return (
    <Toast key={id} variant={variant} {...props}>
      <div className="flex items-start gap-4 w-full text-left">
        {/* APP ICON WITH MOOD GLOW */}
        <div className="relative shrink-0">
          <img
            src="/UsersAvatar.jpg"
            alt="Medrae"
            className={cn(
              "w-11 h-11 rounded-xl object-cover border-2 shadow-sm transition-all duration-500",
              variant === "success" && "border-emerald-500 shadow-emerald-500/40",
              variant === "destructive" && "border-rose-500 shadow-rose-500/40",
              variant === "achievement" && "border-purple-500 shadow-purple-500/50 animate-pulse",
              (!variant || variant === "default") && "border-zinc-200 dark:border-zinc-700"
            )}
          />
        </div>

        {/* TEXT SECTION - PERFECTLY ALIGNED TOP-LEFT */}
        <div className="flex flex-col flex-1 pt-0.5">
          <span className={cn(
            "text-[10px] uppercase tracking-[0.1em] font-black mb-0.5",
            variant === "success" && "text-emerald-600 dark:text-emerald-400",
            variant === "destructive" && "text-rose-600 dark:text-rose-400",
            variant === "achievement" && "text-purple-600 dark:text-purple-400",
            (!variant || variant === "default") && "opacity-40"
          )}>
            Medrae
          </span>

          {title && <ToastTitle>{title}</ToastTitle>}
          {description && (
            <ToastDescription className="mt-0.5">{description}</ToastDescription>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
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
      <ToastViewport />
    </ToastProvider>
  );
}