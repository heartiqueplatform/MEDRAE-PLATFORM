import type React from "react";

export type SidebarAccent = "blue" | "emerald" | "violet";

export type ScrollSection = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

export type GuideLink = {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

export const ACCENT_MAP: Record<
    SidebarAccent,
    { activeBg: string; activeText: string; ctaBg: string; ctaHover: string }
> = {
    blue: { activeBg: "bg-blue-50", activeText: "text-blue-700", ctaBg: "bg-blue-600", ctaHover: "hover:bg-blue-700" },
    emerald: { activeBg: "bg-emerald-50", activeText: "text-emerald-700", ctaBg: "bg-emerald-600", ctaHover: "hover:bg-emerald-700" },
    violet: { activeBg: "bg-violet-50", activeText: "text-violet-700", ctaBg: "bg-violet-600", ctaHover: "hover:bg-violet-700" },
};

export function doScroll(id: string) {
    if (id === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[nav] no element #${id} on this page`);
        return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top, behavior: "smooth" });
    }, 60);
}

export function handleExitSystem() {
    if ((window as any).electronAPI?.quitApp) {
        (window as any).electronAPI.quitApp();
    } else if (confirm("Exit Medrae? You'll be signed out from this tab.")) {
        window.location.href = "about:blank";
    }
}