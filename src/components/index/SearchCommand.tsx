import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, X } from "lucide-react";
import type { ScrollSection, GuideLink } from "./navShared";
import { doScroll, ACCENT_MAP, type SidebarAccent } from "./navShared";

export function SearchCommand({
    open,
    onClose,
    sections,
    guides,
    accent,
}: {
    open: boolean;
    onClose: () => void;
    sections: readonly ScrollSection[];
    guides: readonly GuideLink[];
    accent: SidebarAccent;
}) {
    const nav = useNavigate();
    const A = ACCENT_MAP[accent];
    const [query, setQuery] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);

    // Reset query when opening
    useEffect(() => {
        if (open) {
            setQuery("");
            setActiveIdx(0);
        }
    }, [open]);

    // Build unified result list
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();

        const sectionResults = sections
            .filter((s) => !q || s.label.toLowerCase().includes(q))
            .map((s) => ({
                kind: "section" as const,
                label: s.label,
                icon: s.icon,
                onSelect: () => {
                    onClose();
                    setTimeout(() => doScroll(s.id), 150);
                },
            }));

        const guideResults = guides
            .filter((g) => !q || g.label.toLowerCase().includes(q))
            .map((g) => ({
                kind: "guide" as const,
                label: g.label,
                icon: g.icon,
                onSelect: () => {
                    onClose();
                    nav(g.to);
                },
            }));

        return [...sectionResults, ...guideResults];
    }, [query, sections, guides, nav, onClose]);

    // Keyboard nav
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") { onClose(); return; }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                results[activeIdx]?.onSelect();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, results, activeIdx, onClose]);

    // Clamp activeIdx when results change
    useEffect(() => {
        if (activeIdx >= results.length) setActiveIdx(Math.max(0, results.length - 1));
    }, [results.length, activeIdx]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Panel */}
            <div className="relative w-full max-w-xl bg-white rounded-2xl
                      shadow-2xl ring-1 ring-slate-900/10 overflow-hidden">
                {/* Input row */}
                <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200/70">
                    <Search className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={2.2} />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                        placeholder="Search sections and guides…"
                        className="flex-1 h-full bg-transparent outline-none text-[15px] text-slate-900
                       placeholder:text-slate-400"
                    />
                    <button
                        onClick={onClose}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                       text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        aria-label="Close search"
                    >
                        <X className="w-4 h-4" strokeWidth={2.2} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2">
                    {results.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[13px] text-slate-400">
                            No results for "{query}"
                        </p>
                    ) : (
                        <>
                            {results.some((r) => r.kind === "section") && (
                                <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                    Sections
                                </p>
                            )}
                            {results.map((r, i) => {
                                const Icon = r.icon;
                                const isActive = i === activeIdx;
                                const showGuideHeader =
                                    r.kind === "guide" &&
                                    (i === 0 || results[i - 1]?.kind !== "guide");
                                return (
                                    <div key={`${r.kind}-${r.label}`}>
                                        {showGuideHeader && (
                                            <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                                Guides
                                            </p>
                                        )}
                                        <button
                                            onMouseEnter={() => setActiveIdx(i)}
                                            onClick={r.onSelect}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                  text-sm font-semibold text-left transition-colors
                                  ${isActive
                                                    ? `${A.activeBg} ${A.activeText}`
                                                    : "text-slate-700 hover:bg-slate-100"}`}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                                            <span className="truncate flex-1">{r.label}</span>
                                            {isActive && (
                                                <CornerDownLeft className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer hint */}
                <div className="flex items-center gap-4 px-4 h-10 border-t border-slate-200/70
                        text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 leading-none">↑↓</kbd>
                        navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 leading-none">↵</kbd>
                        select
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 leading-none">esc</kbd>
                        close
                    </span>
                </div>
            </div>
        </div>
    );
}