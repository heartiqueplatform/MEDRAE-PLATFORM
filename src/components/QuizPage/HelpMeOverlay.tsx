"use client";

import { X, MessageSquare, Users, ShieldCheck, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type HelpMeOverlayProps = {
    helpMeOverlayOpen: boolean;
    setHelpMeOverlayOpen: (v: boolean) => void;
    helpMeHelpers: any[];
    currentQuestionText: string;
};

export function HelpMeOverlay({
    helpMeOverlayOpen,
    setHelpMeOverlayOpen,
    helpMeHelpers,
    currentQuestionText,
}: HelpMeOverlayProps) {
    const [copied, setCopied] = useState(false);
    if (!helpMeOverlayOpen) return null;
    const handleCopyQuestion = () => {
        const prefilledMessage = `Hi Group! Can anyone help me with this question? #MedraeLearning\n\n${currentQuestionText}\n\nThanks!`;
        navigator.clipboard.writeText(prefilledMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Visual feedback instead of alert()
    };
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
                                    <img src="/UsersAvatar.jpg" alt="Group" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">Medrae Nursing Group</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Over 500+ students active now. Best for quick peer-to-peer discussions.
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
                                        onClick={() => window.open("https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV", "_blank")}
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
                                    <img src="/UsersAvatar.jpg" alt="Assistance" className="w-10 h-10 rounded-full object-cover" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">Medrae Assistance</p>
                                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Official Tutor • Online</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const message = encodeURIComponent(`Hi Medrae! Kindly Help me with this question?\n\n${currentQuestionText}`);
                                        window.open(`https://wa.me/254704473503?text=${message}`, "_blank");
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    Message
                                </button>
                            </div>
                        </section>

                        {/* 3. Peer Helpers List */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Peers</h3>
                            <div className="space-y-2">
                                {helpMeHelpers.length > 0 ? (
                                    helpMeHelpers.map((helper) => (
                                        <div
                                            key={helper.id}
                                            className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all"
                                        >
                                            <img
                                                src={helper.profiles.avatar_url || "/UsersAvatar.jpg"}
                                                alt={helper.profiles.name}
                                                className="w-10 h-10 rounded-lg object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{helper.profiles.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate italic">Ready to help</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const message = encodeURIComponent(`Hi! Can you help me with this question?\n\n${currentQuestionText}`);
                                                    window.open(`https://wa.me/${helper.whatsapp}?text=${message}`, "_blank");
                                                }}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
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