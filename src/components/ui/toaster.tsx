import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { playSound } from "@/lib/soundManager";

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        if (props.variant === "destructive") {
          playSound("start", false);
        }


        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="fixed !top-auto !bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 w-full max-w-xs sm:max-w-sm" />


    </ToastProvider>
  )
}
