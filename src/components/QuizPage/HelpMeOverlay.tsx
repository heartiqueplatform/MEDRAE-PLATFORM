"use client";

import {
    X,
    MessageSquare,
    Users,
    ShieldCheck,
    Copy,
    ExternalLink,
    CheckCircle2,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Static content                                                    */
/* ------------------------------------------------------------------ */

const STATIC_CONTENT = {
    groupLink: "https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV",
    assistanceWhatsApp: "254704473503",
    groupName: "Medrae Nursing Group",
    groupDescription:
        "Over 500+ students active now. Best for quick peer-to-peer discussions.",
    assistanceName: "Medrae Assistance",
    assistanceRole: "Official Tutor • Online",
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type HelpMeOverlayProps = {
    helpMeOverlayOpen: boolean;
    setHelpMeOverlayOpen: (v: boolean) => void;
    helpMeHelpers: any[];
    currentQuestionText: string;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function HelpMeOverlay({
    helpMeOverlayOpen,
    setHelpMeOverlayOpen,
    helpMeHelpers,
    currentQuestionText,
}: HelpMeOverlayProps) {
    const [copied, setCopied] = useState(false);
    const [copiedHelperId, setCopiedHelperId] = useState<string | null>(null);
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const helperCopyTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            helperCopyTimeouts.current.forEach(clearTimeout);
            helperCopyTimeouts.current.clear();
        };
    }, []);

    const handleClose = useCallback(() => {
        tap();
        setHelpMeOverlayOpen(false);
    }, [setHelpMeOverlayOpen]);

    const handleCopyQuestion = useCallback(() => {
        const prefilledMessage =
            `Hi Group! Can anyone help me with this question? #MedraeLearning\n\n` +
            `${currentQuestionText}\n\nThanks!`;
        navigator.clipboard.writeText(prefilledMessage);
        tap("success");
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }, [currentQuestionText]);

    const handleCopyHelperNumber = useCallback(
        (whatsapp: string, helperId: string) => {
            navigator.clipboard.writeText(whatsapp);
            tap("success");
            setCopiedHelperId(helperId);
            const existing = helperCopyTimeouts.current.get(helperId);
            if (existing) clearTimeout(existing);
            const timeout = setTimeout(() => {
                setCopiedHelperId(null);
                helperCopyTimeouts.current.delete(helperId);
            }, 2000);
            helperCopyTimeouts.current.set(helperId, timeout);
        },
        []
    );

    const getWhatsAppUrl = useCallback(
        (phoneNumber: string, message: string) => {
            const encodedMessage = encodeURIComponent(message);
            const cleanNumber = phoneNumber.replace(/\D/g, "");
            return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
        },
        []
    );

    const getHelpMessage = useCallback(
        () => `Hi! Can you help me with this question?\n\n${currentQuestionText}`,
        [currentQuestionText]
    );

    if (!helpMeOverlayOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center
                           bg-black/60 p-0 sm:p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-md
                               bg-white dark:bg-[#161b22]
                               rounded-t-2xl sm:rounded-2xl
                               flex flex-col max-h-[90dvh]
                               overflow-hidden shadow-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="help-me-title"
                >
                    {/* ── Header (pinned) ─────────────────── */}
                    <header className="shrink-0 flex items-center gap-3 px-4 h-14
                                       border-b border-slate-200/70 dark:border-white/[0.06]">
                        <div className="h-9 w-9 rounded-xl bg-blue-400/10
                                        flex items-center justify-center shrink-0">
                            <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2
                                id="help-me-title"
                                className="text-base font-bold leading-tight truncate
                                           text-slate-900 dark:text-white"
                            >
                                Academic support
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                                Get help from tutors and peers
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="h-9 w-9 rounded-full flex items-center justify-center
                                       text-slate-700 dark:text-slate-200 shrink-0
                                       active:bg-slate-100 dark:active:bg-white/5"
                            style={{ touchAction: "manipulation" }}
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                    </header>

                    {/* ── Scrollable body ─────────────────── */}
                    <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                        {/* 1. Community group */}
                        <section className="px-4 pt-4 pb-3 space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400
                                           flex items-center gap-1.5 px-1">
                                <Users className="h-3 w-3" />
                                Community learning
                            </h3>
                            <div className="rounded-2xl bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
                                <div className="p-3 flex items-start gap-3">
                                    <img
                                        src="/UsersAvatar.jpg"
                                        alt="Group"
                                        className="w-11 h-11 rounded-full object-cover shrink-0"
                                        loading="lazy"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            {STATIC_CONTENT.groupName}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                                            {STATIC_CONTENT.groupDescription}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 p-2 pt-0">
                                    <button
                                        onClick={handleCopyQuestion}
                                        className={`h-10 rounded-xl text-[12px] font-bold
                                                   flex items-center justify-center gap-1.5
                                                   active:scale-[0.97] transition-transform
                                                   ${copied
                                                ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                                                : "bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                            }`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {copied ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                        {copied ? "Copied" : "Copy question"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            tap();
                                            window.open(STATIC_CONTENT.groupLink, "_blank");
                                        }}
                                        className="h-10 rounded-xl text-[12px] font-bold
                                                   bg-blue-600 text-white
                                                   flex items-center justify-center gap-1.5
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Join group
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 2. Verified support */}
                        <section className="px-4 pt-2 pb-3 space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400
                                           flex items-center gap-1.5 px-1">
                                <ShieldCheck className="h-3 w-3" />
                                Verified support
                            </h3>
                            <div className="flex items-center gap-3 p-3 rounded-2xl
                                            bg-emerald-50 dark:bg-emerald-400/10">
                                <div className="relative shrink-0">
                                    <img
                                        src="/UsersAvatar.jpg"
                                        alt="Assistance"
                                        className="w-10 h-10 rounded-full object-cover"
                                        loading="lazy"
                                    />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5
                                                     bg-emerald-500 rounded-full
                                                     ring-2 ring-white dark:ring-[#161b22]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {STATIC_CONTENT.assistanceName}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                  text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                                        {STATIC_CONTENT.assistanceRole}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        tap();
                                        const url = getWhatsAppUrl(
                                            STATIC_CONTENT.assistanceWhatsApp,
                                            getHelpMessage()
                                        );
                                        window.open(url, "_blank");
                                    }}
                                    className="h-9 px-3 rounded-xl bg-emerald-600 text-white
                                               text-[12px] font-bold shrink-0
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Message
                                </button>
                            </div>
                        </section>

                        {/* 3. Peer helpers */}
                        <section className="px-4 pt-2 pb-4 space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400 px-1">
                                Available peers
                            </h3>
                            {helpMeHelpers.length > 0 ? (
                                <div className="space-y-1.5">
                                    {helpMeHelpers.map((helper) => {
                                        const isHelperCopied =
                                            copiedHelperId === helper.id;
                                        return (
                                            <div
                                                key={helper.id}
                                                className="flex items-center gap-3 p-2.5 rounded-xl
                                                           bg-slate-50 dark:bg-[#0d1117]"
                                            >
                                                <img
                                                    src={
                                                        helper.profiles.avatar_url ||
                                                        "/UsersAvatar.jpg"
                                                    }
                                                    alt={helper.profiles.name}
                                                    className="w-9 h-9 rounded-full object-cover shrink-0"
                                                    loading="lazy"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                        {helper.profiles.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                                        Ready to help
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() =>
                                                            handleCopyHelperNumber(
                                                                helper.whatsapp,
                                                                helper.id
                                                            )
                                                        }
                                                        className={`h-8 w-8 rounded-full
                                                                   flex items-center justify-center
                                                                   active:scale-[0.92] transition-transform
                                                                   ${isHelperCopied
                                                                ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                                                                : "bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                                            }`}
                                                        style={{ touchAction: "manipulation" }}
                                                        aria-label="Copy number"
                                                    >
                                                        {isHelperCopied ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            tap();
                                                            const url = getWhatsAppUrl(
                                                                helper.whatsapp,
                                                                getHelpMessage()
                                                            );
                                                            window.open(url, "_blank");
                                                        }}
                                                        className="h-8 w-8 rounded-full
                                                                   flex items-center justify-center
                                                                   bg-blue-600 text-white
                                                                   active:scale-[0.92] transition-transform"
                                                        style={{ touchAction: "manipulation" }}
                                                        aria-label="Message on WhatsApp"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] py-6 px-4 text-center">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                        No peer helpers online right now. Use the group above.
                                    </p>
                                </div>
                            )}
                        </section>
                    </main>

                    {/* ── Footer (pinned) ─────────────────── */}
                    <footer className="shrink-0 px-4 py-3
                                       border-t border-slate-200/70 dark:border-white/[0.06]">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-snug">
                            Tip: copying the question makes it easier for helpers to read.
                        </p>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}