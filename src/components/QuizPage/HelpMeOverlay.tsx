"use client";

import { X, MessageSquare, Users, ShieldCheck, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type HelpMeOverlayProps = {
    helpMeOverlayOpen: boolean;
    setHelpMeOverlayOpen: (v: boolean) => void;
    helpMeHelpers: any[];
    currentQuestionText: string;
};

const STATIC_CONTENT = {
    groupLink: "https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV",
    assistanceWhatsApp: "254704473503",
    groupName: "Medrae Nursing Group",
    groupDescription: "Over 500+ students active now. Best for quick peer-to-peer discussions.",
    assistanceName: "Medrae Assistance",
    assistanceRole: "Official Tutor • Online"
};

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

    const handleCopyQuestion = useCallback(() => {
        const prefilledMessage = `Hi Group! Can anyone help me with this question? #MedraeLearning\n\n${currentQuestionText}\n\nThanks!`;
        navigator.clipboard.writeText(prefilledMessage);
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }, [currentQuestionText]);

    const handleCopyHelperNumber = useCallback((whatsapp: string, helperId: string) => {
        navigator.clipboard.writeText(whatsapp);
        setCopiedHelperId(helperId);
        const existing = helperCopyTimeouts.current.get(helperId);
        if (existing) clearTimeout(existing);
        const timeout = setTimeout(() => {
            setCopiedHelperId(null);
            helperCopyTimeouts.current.delete(helperId);
        }, 2000);
        helperCopyTimeouts.current.set(helperId, timeout);
    }, []);

    const getWhatsAppUrl = useCallback((phoneNumber: string, message: string) => {
        const encodedMessage = encodeURIComponent(message);
        const cleanNumber = phoneNumber.replace(/\D/g, "");
        return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    }, []);

    const getHelpMessage = useCallback(
        () => `Hi! Can you help me with this question?\n\n${currentQuestionText}`,
        [currentQuestionText]
    );

    if (!helpMeOverlayOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[2147483647] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                onClick={() => setHelpMeOverlayOpen(false)}
            >
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header — flat, borderless */}
                    <div className="px-5 pt-5 pb-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-full">
                                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-white">
                                    Academic Support
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Get help from tutors and peers
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setHelpMeOverlayOpen(false)}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Scrollable body — flat sections */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">

                        {/* 1. Community Group */}
                        <section className="px-5 py-4 space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" />
                                Community Learning
                            </h3>
                            <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                                <div className="p-4 flex items-start gap-3">
                                    <img
                                        src="/UsersAvatar.jpg"
                                        alt="Group"
                                        className="w-12 h-12 rounded-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                                            {STATIC_CONTENT.groupName}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                                            {STATIC_CONTENT.groupDescription}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-px bg-slate-200/70 dark:bg-slate-800">
                                    <button
                                        onClick={handleCopyQuestion}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${copied
                                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            }`}
                                    >
                                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? "Question Copied" : "Copy Question"}
                                    </button>
                                    <button
                                        onClick={() => window.open(STATIC_CONTENT.groupLink, "_blank")}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Join Group
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 2. Verified Support */}
                        <section className="px-5 py-4 space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verified Support
                            </h3>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10">
                                <div className="relative shrink-0">
                                    <img
                                        src="/UsersAvatar.jpg"
                                        alt="Assistance"
                                        className="w-11 h-11 rounded-full object-cover"
                                        loading="lazy"
                                    />
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {STATIC_CONTENT.assistanceName}
                                    </p>
                                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {STATIC_CONTENT.assistanceRole}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = getWhatsAppUrl(
                                            STATIC_CONTENT.assistanceWhatsApp,
                                            getHelpMessage()
                                        );
                                        window.open(url, "_blank");
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition"
                                >
                                    Message
                                </button>
                            </div>
                        </section>

                        {/* 3. Peer Helpers */}
                        <section className="px-5 py-4 space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Available Peers
                            </h3>
                            <div className="space-y-1">
                                {helpMeHelpers.length > 0 ? (
                                    helpMeHelpers.map((helper) => {
                                        const isHelperCopied = copiedHelperId === helper.id;
                                        return (
                                            <div
                                                key={helper.id}
                                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                <img
                                                    src={helper.profiles.avatar_url || "/UsersAvatar.jpg"}
                                                    alt={helper.profiles.name}
                                                    className="w-10 h-10 rounded-full object-cover shrink-0"
                                                    loading="lazy"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                                        {helper.profiles.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 italic">
                                                        Ready to help
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleCopyHelperNumber(helper.whatsapp, helper.id)}
                                                        className={`p-2 rounded-full transition-colors ${isHelperCopied
                                                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                                            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
                                                            }`}
                                                        aria-label="Copy number"
                                                    >
                                                        {isHelperCopied ? (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const url = getWhatsAppUrl(
                                                                helper.whatsapp,
                                                                getHelpMessage()
                                                            );
                                                            window.open(url, "_blank");
                                                        }}
                                                        className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                        aria-label="Message on WhatsApp"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                        <p className="text-xs text-slate-400 italic">
                                            No peer helpers online. Use the group above!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer — flat */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 text-center">
                        <p className="text-[10px] text-slate-400">
                            Tip: Copying the question makes it easier for helpers to read.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}