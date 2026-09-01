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

// ✅ Cache for group links and static content (never changes)
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

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
            helperCopyTimeouts.current.forEach(timeout => {
                clearTimeout(timeout);
            });
            helperCopyTimeouts.current.clear();
        };
    }, []);

    // ✅ Optimized copy function with visual feedback and no alerts
    const handleCopyQuestion = useCallback(() => {
        const prefilledMessage = `Hi Group! Can anyone help me with this question? #MedraeLearning\n\n${currentQuestionText}\n\nThanks!`;
        navigator.clipboard.writeText(prefilledMessage);
        setCopied(true);

        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }, [currentQuestionText]);

    // ✅ Optimized copy for helper WhatsApp numbers
    const handleCopyHelperNumber = useCallback((whatsapp: string, helperId: string) => {
        navigator.clipboard.writeText(whatsapp);
        setCopiedHelperId(helperId);

        // Clear existing timeout for this helper
        const existingTimeout = helperCopyTimeouts.current.get(helperId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
            setCopiedHelperId(null);
            helperCopyTimeouts.current.delete(helperId);
        }, 2000);

        helperCopyTimeouts.current.set(helperId, timeout);
    }, []);

    // ✅ Optimized WhatsApp message with caching
    const getWhatsAppUrl = useCallback((phoneNumber: string, message: string) => {
        const encodedMessage = encodeURIComponent(message);
        // Remove any non-numeric characters from phone number
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    }, []);

    // ✅ Pre-built message template (reduces runtime string operations)
    const getHelpMessage = useCallback(() => {
        return `Hi! Can you help me with this question?\n\n${currentQuestionText}`;
    }, [currentQuestionText]);

    const getGroupMessage = useCallback(() => {
        return `Hi Group! Can anyone help me with this question? #MedraeLearning\n\n${currentQuestionText}\n\nThanks!`;
    }, [currentQuestionText]);

    if (!helpMeOverlayOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                onClick={() => setHelpMeOverlayOpen(false)}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-card dark:bg-muted/30 w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header: Professional Branding */}
                    <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold leading-none">Academic Support</h2>
                                <p className="text-xs text-muted-foreground mt-1">Get help from tutors and peers</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setHelpMeOverlayOpen(false)}
                            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5 overflow-y-auto space-y-6 custom-scrollbar">

                        {/* 1. Official Community Group */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Community Learning
                            </h3>
                            <div className="group relative p-4 rounded-xl border border-border bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 hover:shadow-md transition-all">
                                <div className="flex items-start gap-4 mb-4">
                                    <img
                                        src="/UsersAvatar.jpg"
                                        alt="Group"
                                        className="w-12 h-12 rounded-xl object-cover shadow-sm"
                                        loading="lazy"
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{STATIC_CONTENT.groupName}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {STATIC_CONTENT.groupDescription}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyQuestion}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg border transition-all ${copied ? "bg-green-50 border-green-200 text-green-600" : "bg-white dark:bg-slate-800 border-border hover:border-primary/50 text-foreground"
                                            }`}
                                    >
                                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? "Question Copied" : "Copy Question"}
                                    </button>
                                    <button
                                        onClick={() => window.open(STATIC_CONTENT.groupLink, "_blank")}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Join Group
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 2. Official Pinned Contact */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified Support
                            </h3>
                            <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 transition-all">
                                <div className="relative">
                                    <img
                                        src="/UsersAvatar.jpg"
                                        alt="Assistance"
                                        className="w-10 h-10 rounded-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{STATIC_CONTENT.assistanceName}</p>
                                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{STATIC_CONTENT.assistanceRole}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const message = getHelpMessage();
                                            const url = getWhatsAppUrl(STATIC_CONTENT.assistanceWhatsApp, message);
                                            window.open(url, "_blank");
                                        }}
                                        className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        Message
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* 3. Peer Helpers List - ✅ Optimized rendering */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Peers</h3>
                            <div className="space-y-2">
                                {helpMeHelpers.length > 0 ? (
                                    helpMeHelpers.map((helper) => {
                                        const isHelperCopied = copiedHelperId === helper.id;
                                        return (
                                            <div
                                                key={helper.id}
                                                className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all"
                                            >
                                                <img
                                                    src={helper.profiles.avatar_url || "/UsersAvatar.jpg"}
                                                    alt={helper.profiles.name}
                                                    className="w-10 h-10 rounded-lg object-cover"
                                                    loading="lazy"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate">{helper.profiles.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate italic">Ready to help</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {/* Copy Number Button */}
                                                    <button
                                                        onClick={() => handleCopyHelperNumber(helper.whatsapp, helper.id)}
                                                        className={`p-2 rounded-lg transition-colors ${isHelperCopied ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                                                        title="Copy phone number"
                                                    >
                                                        {isHelperCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                    {/* Message Button */}
                                                    <button
                                                        onClick={() => {
                                                            const message = getHelpMessage();
                                                            const url = getWhatsAppUrl(helper.whatsapp, message);
                                                            window.open(url, "_blank");
                                                        }}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Send WhatsApp message"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                                        <p className="text-xs text-muted-foreground italic">No peer helpers online. Use the group above!</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer Tip */}
                    <div className="p-4 bg-muted/50 border-t border-border text-center">
                        <p className="text-[10px] text-muted-foreground">
                            Tip: Copying the question makes it easier for helpers to read.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}