"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    Bell, X, Loader2, BookOpen, Flame, Users, RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/* ---------- Telegram logo (inline SVG) ---------- */
function TelegramLogo({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="tgGradPrefs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2AABEE" />
                    <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#tgGradPrefs)" />
            <path
                fill="#FFFFFF"
                d="M54.3 118.3l139.1-53.6c6.5-2.4 12.2 1.6 10.1 11.5l-23.7 111.6c-1.8 8.1-6.6 10.1-13.4 6.3l-37-27.3-17.8 17.2c-2 2-3.6 3.6-7.4 3.6l2.7-37.7 68.7-62c3-2.7-.7-4.2-4.6-1.6l-84.9 53.5-36.6-11.4c-7.9-2.5-8.1-7.9 1.8-11.1z"
            />
        </svg>
    );
}

interface NotificationPreferencesProps {
    open: boolean;
    onClose: () => void;
}

type Prefs = {
    personal: boolean;
    streaks: boolean;
    broadcasts: boolean;
};

const DEFAULT_PREFS: Prefs = {
    personal: true,
    streaks: true,
    broadcasts: true,
};

export function NotificationPreferences({
    open,
    onClose,
}: NotificationPreferencesProps) {
    const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        (async () => {
            setLoading(true);
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) {
                setLoading(false);
                return;
            }
            const { data } = await supabase
                .from("profiles")
                .select("telegram_prefs")
                .eq("user_id", auth.user.id)
                .maybeSingle();

            if (data?.telegram_prefs) {
                setPrefs({ ...DEFAULT_PREFS, ...(data.telegram_prefs as Prefs) });
            }
            setLoading(false);
        })();
    }, [open]);

    const save = useCallback(
        async (next: Prefs) => {
            setSaving(true);
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) {
                setSaving(false);
                return;
            }
            const { error } = await supabase
                .from("profiles")
                .update({ telegram_prefs: next })
                .eq("user_id", auth.user.id);
            setSaving(false);
            if (error) {
                console.error("Save prefs failed", error);
                // optimistic rollback
                setPrefs((p) => p);
            } else {
                setPrefs(next);
            }
        },
        [],
    );

    if (!mounted || !open) return null;

    /* ---------- Row primitive (matches Notifications card list) ---------- */
    const PrefRow = ({
        icon,
        label,
        sub,
        value,
        color,
        bg,
        onToggle,
    }: {
        icon: React.ReactNode;
        label: string;
        sub: string;
        value: boolean;
        color: string;
        bg: string;
        onToggle: () => void;
    }) => (
        <Card
            onClick={saving ? undefined : onToggle}
            className={`transition-all cursor-pointer rounded-xl border-0 shadow-sm ${value
                ? "bg-white dark:bg-muted/30 hover:shadow-md"
                : "opacity-60 bg-white dark:bg-slate-900/40"
                }`}
        >
            <CardContent className="p-3 md:p-4 flex gap-3 items-center">
                <div
                    className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl md:rounded-2xl ${bg} ${color} flex items-center justify-center`}
                >
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs md:text-sm font-bold truncate text-slate-900 dark:text-white">
                        {label}
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2">
                        {sub}
                    </p>
                </div>
                <div
                    className={`w-10 h-6 shrink-0 rounded-full relative transition-colors ${value ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                >
                    <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "right-1" : "left-1"
                            }`}
                    />
                </div>
            </CardContent>
        </Card>
    );

    return createPortal(
        <div
            className="fixed inset-0 z-[2147483647] flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Sheet / Modal */}
            <div
                className="relative w-full md:max-w-lg md:w-full
          bg-white dark:bg-muted/30
          md:rounded-3xl shadow-2xl
          animate-in slide-in-from-bottom duration-300
          max-h-[92vh] md:max-h-[90vh]
          flex flex-col
          pb-[env(safe-area-inset-bottom)]
          border-0 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Gradient wash */}
                <div
                    className="pointer-events-none absolute inset-0 z-0
            bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/30
            dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/10"
                />

                {/* Drag handle (mobile) */}
                <div className="relative z-10 md:hidden flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* Header */}
                <div className="relative z-10 flex items-start justify-between p-4 md:p-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex items-center justify-center shadow-sm">
                            <TelegramLogo className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase text-[#229ED9]">
                                Telegram
                            </span>
                            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                Notification Preferences
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Hairline */}
                <div className="relative z-10 h-px bg-slate-100 dark:bg-slate-800 shrink-0" />

                {/* Body */}
                <div className="relative z-10 p-4 md:p-6 overflow-y-auto flex-1 min-h-0">
                    {loading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="flex gap-3 items-center p-3 md:p-4 bg-white dark:bg-muted/30 rounded-xl border-0"
                                >
                                    <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                        <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                    </div>
                                    <div className="h-6 w-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <PrefRow
                                icon={<Bell className="w-5 h-5 md:w-6 md:h-6" />}
                                label="Personal updates"
                                sub="Quiz results, exam scores, certificates, CPD points"
                                value={prefs.personal}
                                color="text-emerald-600"
                                bg="bg-emerald-100 dark:bg-emerald-900/20"
                                onToggle={() => save({ ...prefs, personal: !prefs.personal })}
                            />
                            <PrefRow
                                icon={<Flame className="w-5 h-5 md:w-6 md:h-6" />}
                                label="Streak reminders"
                                sub="Daily nudge if your study streak is about to end"
                                value={prefs.streaks}
                                color="text-orange-600"
                                bg="bg-orange-100 dark:bg-orange-900/20"
                                onToggle={() => save({ ...prefs, streaks: !prefs.streaks })}
                            />
                            <PrefRow
                                icon={<Users className="w-5 h-5 md:w-6 md:h-6" />}
                                label="Community activity"
                                sub="New students, QFeed images, live classes — max 1 digest per day"
                                value={prefs.broadcasts}
                                color="text-indigo-600"
                                bg="bg-indigo-100 dark:bg-indigo-900/20"
                                onToggle={() => save({ ...prefs, broadcasts: !prefs.broadcasts })}
                            />
                        </div>
                    )}

                    <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            We never send more than one community digest per day. Personal
                            updates and streak reminders are sent only when relevant to you.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex gap-3 p-4 md:p-6 shrink-0 bg-slate-50 dark:bg-slate-900/40 md:rounded-b-3xl border-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-0 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        Close
                    </Button>
                    <Button
                        disabled
                        className="flex-1 border-0 bg-slate-900 dark:bg-slate-700 text-white"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            "Saved automatically"
                        )}
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
}