import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, Check, MapPin, Loader2, ChevronDown } from "lucide-react";
import { playSound } from "@/lib/soundManager";

interface Option {
    id: string;
    name: string;
    subtext?: string;
}

interface SmartSelectProps {
    label?: string;
    options: Option[];
    value: string | null;
    onChange: (id: string) => void;
    placeholder?: string;
    isLoading?: boolean;
    categoryName?: string;
}

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

const SmartSelect = ({
    label,
    options,
    value,
    onChange,
    placeholder,
    isLoading,
    categoryName,
}: SmartSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selectedOption = options.find((opt) => opt.id === value);

    const filtered = useMemo(
        () =>
            options.filter((opt) =>
                opt.name.toLowerCase().includes(search.toLowerCase())
            ),
        [options, search]
    );

    /* Body scroll lock while open */
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    /* Close on ESC */
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    const closeModal = () => {
        setIsOpen(false);
        setSearch("");
    };

    /* ── Modal content ─────────────────────────────────── */
    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={closeModal}
                style={{ touchAction: "manipulation" }}
            />

            {/* Sheet on mobile / card on desktop */}
            <div
                className="relative w-full sm:max-w-md
                           bg-white dark:bg-[#161b22]
                           rounded-t-2xl sm:rounded-2xl
                           flex flex-col
                           max-h-[85dvh] sm:max-h-[600px]
                           overflow-hidden
                           pb-[env(safe-area-inset-bottom)] sm:pb-0"
                role="dialog"
                aria-modal="true"
                aria-labelledby="smartselect-title"
            >
                {/* Header */}
                <header className="shrink-0 border-b border-slate-200/70 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 px-2 h-14">
                        <button
                            onClick={closeModal}
                            aria-label="Close"
                            className="h-10 w-10 rounded-full flex items-center justify-center
                                       text-slate-700 dark:text-slate-200
                                       active:bg-slate-100 dark:active:bg-white/5"
                            style={{ touchAction: "manipulation" }}
                        >
                            <X className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h3
                                id="smartselect-title"
                                className="text-base font-bold leading-tight truncate
                                           text-slate-900 dark:text-white"
                            >
                                Select {categoryName || "an option"}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                                {options.length} available
                            </p>
                        </div>
                    </div>
                </header>

                {/* Search */}
                <div className="shrink-0 px-4 py-2">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                          h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            autoFocus
                            placeholder="Search by name…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 rounded-xl border-0 outline-none
                                       bg-slate-50 dark:bg-[#0d1117]
                                       pl-10 pr-3.5 text-sm
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus:ring-2 focus:ring-blue-500/40"
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-2 space-y-1">
                    {filtered.length > 0 ? (
                        filtered.map((opt) => {
                            const isSelected = value === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        tap();
                                        onChange(opt.id);
                                        closeModal();
                                    }}
                                    className={`w-full flex items-center gap-2.5
                                                p-2.5 rounded-xl text-left
                                                active:scale-[0.99] transition-transform
                                                ${isSelected
                                            ? "bg-blue-50 dark:bg-blue-400/10"
                                            : "bg-slate-50 dark:bg-[#0d1117]"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div
                                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                            }`}
                                    >
                                        <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-[13px] font-bold truncate leading-tight ${isSelected
                                                ? "text-blue-700 dark:text-blue-400"
                                                : "text-slate-900 dark:text-white"
                                                }`}
                                        >
                                            {opt.name}
                                        </p>
                                        {opt.subtext && (
                                            <p className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {opt.subtext}
                                            </p>
                                        )}
                                    </div>

                                    {isSelected && (
                                        <Check
                                            className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0"
                                            strokeWidth={2.5}
                                        />
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="py-10 text-center space-y-2">
                            <div className="h-12 w-12 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto">
                                <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    No results
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Try a different search
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    /* ── Trigger ───────────────────────────────────────── */
    return (
        <div className="w-full">
            {label && (
                <label className="block text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400 mb-1.5 px-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => {
                    tap();
                    setIsOpen(true);
                }}
                className="w-full h-11 flex items-center justify-between gap-2
                           rounded-xl border-0
                           bg-slate-50 dark:bg-[#0d1117]
                           px-3.5
                           active:scale-[0.99] transition-transform"
                style={{ touchAction: "manipulation" }}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                        <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    )}
                    <span
                        className={`truncate text-sm font-semibold ${selectedOption
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-500 dark:text-slate-400"
                            }`}
                    >
                        {selectedOption ? selectedOption.name : placeholder || "Select…"}
                    </span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2.25} />
            </button>

            {isOpen && createPortal(modalContent, document.body)}
        </div>
    );
};

export default SmartSelect;