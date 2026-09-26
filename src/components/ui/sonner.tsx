import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          // ── Base toast: relative so we can absolutely-position the LED line.
          //    Text is centered; we add a bit of left padding so the LED
          //    doesn't crowd content.
          toast: [
            "group toast relative overflow-hidden",
            "group-[.toaster]:bg-background",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:border-border",
            "group-[.toaster]:shadow-lg",
            "group-[.toaster]:rounded-xl",
            "pl-4 pr-4 py-4",
            "flex flex-col items-center text-center gap-2",
          ].join(" "),

          // ── Icon: sits above the title, centered, slightly bigger
          icon: [
            "group-[.toast]:mx-auto",
            "group-[.toast]:mb-1",
            "group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center",
            "group-[.toast]:w-10 group-[.toast]:h-10",
            "group-[.toast]:rounded-full",
            "group-[.toast]:bg-muted/60",
          ].join(" "),

          // ── Title: bold, centered, no forced left alignment
          title: [
            "group-[.toast]:text-center",
            "group-[.toast]:font-semibold",
            "group-[.toast]:text-sm",
            "group-[.toast]:w-full",
          ].join(" "),

          // ── Description: muted, centered, comfortable line-height
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

          // ── Per-type accents (tint the icon bubble + LED line color)
          error: "group-[.toast]:border-l-4 group-[.toast]:border-l-red-500",
          success:
            "group-[.toast]:border-l-4 group-[.toast]:border-l-emerald-500",
          warning:
            "group-[.toast]:border-l-4 group-[.toast]:border-l-amber-500",
          info: "group-[.toast]:border-l-4 group-[.toast]:border-l-sky-500",
          loading: "group-[.toast]:border-l-4 group-[.toast]:border-l-slate-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };