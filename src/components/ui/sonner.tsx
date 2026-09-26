import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// ── Track whether we're on a phone-sized viewport.
//    Sonner's `position` prop is a single value, so we have to
//    swap it in JS when the breakpoint changes.
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // ── Top-center on phones, bottom-right on desktop
      position={isMobile ? "top-center" : "bottom-right"}
      // Offset: clears the iOS/Android notch on mobile, and
      // sits 16px from the bottom-right corner on desktop.
      offset={isMobile ? { top: 72 } : { bottom: 16, right: 16 }}
      // Dismiss every toast after 3 seconds unless the caller
      // overrides `duration` on an individual toast.
      duration={3000}
      toastOptions={{
        // Every toast inherits `duration` from the prop above.
        duration: 3000,
        classNames: {
          // ── Base toast: no borders, soft rounded card, centered stack
          toast: [
            "group toast relative overflow-hidden",
            "group-[.toaster]:bg-background",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:border-0",
            "group-[.toaster]:shadow-lg",
            "group-[.toaster]:rounded-xl",
            "pl-4 pr-4 py-4",
            "flex flex-col items-center text-center gap-2",
            "max-sm:!w-[calc(100vw-2rem)]",
          ].join(" "),

          // ── Icon bubble: centered above the title
          icon: [
            "group-[.toast]:mx-auto",
            "group-[.toast]:mb-1",
            "group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center",
            "group-[.toast]:w-10 group-[.toast]:h-10",
            "group-[.toast]:rounded-full",
            "group-[.toast]:bg-muted/60",
          ].join(" "),

          // ── Title
          title: [
            "group-[.toast]:text-center",
            "group-[.toast]:font-semibold",
            "group-[.toast]:text-sm",
            "group-[.toast]:w-full",
          ].join(" "),

          // ── Description
          description: [
            "group-[.toast]:text-muted-foreground",
            "group-[.toast]:text-center",
            "group-[.toast]:text-xs",
            "group-[.toast]:leading-relaxed",
            "group-[.toast]:w-full",
          ].join(" "),

          // ── Buttons
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",

          // ── Per-type color: tint the icon bubble, no border
          error: [
            "group-[.toast]:border-0",
            "[&_[data-icon]]:bg-red-100 dark:[&_[data-icon]]:bg-red-950/40",
            "[&_[data-icon]>svg]:text-red-600 dark:[&_[data-icon]>svg]:text-red-400",
          ].join(" "),
          success: [
            "group-[.toast]:border-0",
            "[&_[data-icon]]:bg-emerald-100 dark:[&_[data-icon]]:bg-emerald-950/40",
            "[&_[data-icon]>svg]:text-emerald-600 dark:[&_[data-icon]>svg]:text-emerald-400",
          ].join(" "),
          warning: [
            "group-[.toast]:border-0",
            "[&_[data-icon]]:bg-amber-100 dark:[&_[data-icon]]:bg-amber-950/40",
            "[&_[data-icon]>svg]:text-amber-600 dark:[&_[data-icon]>svg]:text-amber-400",
          ].join(" "),
          info: [
            "group-[.toast]:border-0",
            "[&_[data-icon]]:bg-sky-100 dark:[&_[data-icon]]:bg-sky-950/40",
            "[&_[data-icon]>svg]:text-sky-600 dark:[&_[data-icon]>svg]:text-sky-400",
          ].join(" "),
          loading: [
            "group-[.toast]:border-0",
            "[&_[data-icon]]:bg-slate-100 dark:[&_[data-icon]]:bg-slate-900",
            "[&_[data-icon]>svg]:text-slate-500 dark:[&_[data-icon]>svg]:text-slate-400",
          ].join(" "),
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };