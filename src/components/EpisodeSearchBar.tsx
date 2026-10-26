"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Loader2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
    id: string;
    title: string;
    showTitle?: string;
    artwork?: string;
    duration?: number;
    publishedAt?: string;
}

interface Props {
    /** Layer 1 — instant, in-memory. */
    onSearchMemory: (query: string) => SearchResult[];
    /** Layer 2 — Dexie, ~5 ms. */
    onSearchLocal: (query: string) => Promise<SearchResult[]>;
    /** Layer 3 — Supabase, ~200 ms, debounced. */
    onSearchRemote: (query: string) => Promise<SearchResult[]>;
    /** Called when a result is tapped. */
    onSelect: (result: SearchResult) => void;
    placeholder?: string;
    debounceMs?: number;
}

function fmtTime(seconds?: number) {
    if (!seconds || !isFinite(seconds)) return "";
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function EpisodeSearchBar({
    onSearchMemory,
    onSearchLocal,
    onSearchRemote,
    onSelect,
    placeholder = "Search episodes…",
    debounceMs = 150,
}: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [remoteLoading, setRemoteLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const remoteSeqRef = useRef(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Layer 1: instant memory search runs on every keystroke ──
    useEffect(() => {
        const q = query.trim();
        if (q.length === 0) {
            setResults([]);
            setRemoteLoading(false);
            return;
        }

        const memory = onSearchMemory(q);
        setResults(memory);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        const seq = ++remoteSeqRef.current;
        setRemoteLoading(true);

        debounceRef.current = setTimeout(async () => {
            const local = await onSearchLocal(q);
            if (seq !== remoteSeqRef.current) return;
            if (local.length > 0) setResults(local);

            const remote = await onSearchRemote(q);
            if (seq !== remoteSeqRef.current) return;
            if (remote.length > 0) setResults(remote);
            setRemoteLoading(false);
        }, debounceMs);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, onSearchMemory, onSearchLocal, onSearchRemote, debounceMs]);

    // ── Click outside closes the dropdown ──
    useEffect(() => {
        if (!open) return;
        const onDocDown = (e: MouseEvent | TouchEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDocDown);
        document.addEventListener("touchstart", onDocDown);
        return () => {
            document.removeEventListener("mousedown", onDocDown);
            document.removeEventListener("touchstart", onDocDown);
        };
    }, [open]);

    // ── Keyboard navigation ──
    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                const pick = results[activeIndex >= 0 ? activeIndex : 0];
                if (pick) {
                    onSelect(pick);
                    setOpen(false);
                    setQuery("");
                    inputRef.current?.blur();
                }
            }
        },
        [results, activeIndex, onSelect]
    );

    const grouped = useMemo(() => {
        const map = new Map<string, SearchResult[]>();
        for (const r of results) {
            const key = r.showTitle ?? "Episodes";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        }
        return Array.from(map.entries()).slice(0, 6);
    }, [results]);

    return (
        <div ref={wrapRef} className="relative w-full">
            {/* ── Input ── */}
            <div
                className="
                    relative flex items-center
                    h-11 md:h-12
                    rounded-2xl
                    bg-gh-l-hover dark:bg-gh-hover
                    focus-within:bg-gh-l-card dark:focus-within:bg-gh-card
                    transition-colors
                "
            >
                <Search
                    size={18}
                    className="ml-3.5 text-gh-l-muted dark:text-gh-muted shrink-0"
                />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setActiveIndex(-1);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className="
                        flex-1 h-full
                        bg-transparent outline-none border-0
                        px-3 text-[14px] font-medium
                        text-gh-l-text dark:text-gh-text
                        placeholder:text-gh-l-muted dark:placeholder:text-gh-muted
                    "
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    inputMode="search"
                    aria-label="Search episodes"
                />
                {remoteLoading && query.length > 0 && (
                    <Loader2
                        size={16}
                        className="mr-2 text-gh-l-muted dark:text-gh-muted animate-spin shrink-0"
                    />
                )}
                {query.length > 0 && !remoteLoading && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setResults([]);
                            inputRef.current?.focus();
                        }}
                        className="
                            mr-2 p-1.5 rounded-full
                            text-gh-l-muted dark:text-gh-muted
                            hover:text-gh-l-text dark:hover:text-gh-text
                            hover:bg-black/5 dark:hover:bg-white/5
                            transition-colors
                        "
                        aria-label="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* ── Results dropdown ── */}
            <AnimatePresence>
                {open && query.trim().length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.12 }}
                        className="
                            absolute top-full left-0 right-0 mt-2 z-50
                            max-h-[60vh] overflow-y-auto custom-scrollbar
                            rounded-2xl
                            bg-gh-l-card dark:bg-gh-card
                            shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]
                            dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]
                        "
                    >
                        {results.length === 0 && remoteLoading && (
                            <div className="px-4 py-8 text-center text-[12px] text-gh-l-muted dark:text-gh-muted">
                                Searching…
                            </div>
                        )}

                        {results.length === 0 && !remoteLoading && (
                            <div className="px-4 py-8 text-center text-[12px] text-gh-l-muted dark:text-gh-muted">
                                No episodes match "{query}"
                            </div>
                        )}

                        {grouped.map(([show, items]) => (
                            <div key={show}>
                                <div className="px-4 pt-3 pb-1 text-[10px]   uppercase tracking-widest text-gh-l-muted dark:text-gh-muted">
                                    {show}
                                </div>
                                {items.map((r) => {
                                    const flatIdx = results.indexOf(r);
                                    const active = flatIdx === activeIndex;
                                    return (
                                        <button
                                            key={r.id}
                                            onClick={() => {
                                                onSelect(r);
                                                setOpen(false);
                                                setQuery("");
                                                inputRef.current?.blur();
                                            }}
                                            onMouseEnter={() => setActiveIndex(flatIdx)}
                                            className={`
                                                w-full flex items-center gap-3 px-4 py-2.5 text-left
                                                transition-colors
                                                ${active
                                                    ? "bg-blue-50 dark:bg-blue-950/40"
                                                    : "hover:bg-gh-l-hover dark:hover:bg-gh-hover"}
                                            `}
                                        >
                                            <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                                                {r.artwork ? (
                                                    <img
                                                        src={r.artwork}
                                                        alt=""
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gh-l-muted dark:text-gh-muted">
                                                        <Play size={14} fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-semibold text-gh-l-text dark:text-gh-text truncate">
                                                    {r.title}
                                                </p>
                                                <p className="text-[10px] text-gh-l-muted dark:text-gh-muted truncate mt-0.5">
                                                    {r.showTitle}
                                                    {r.duration && ` · ${fmtTime(r.duration)}`}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}