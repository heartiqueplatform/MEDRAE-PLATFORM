// src/components/AdminNotificationPanel.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import {
    Bell, Send, Globe, User, AlertCircle, CheckCircle2,
    Loader2, Sparkles, X, ChevronDown,
    Trophy, CreditCard, Home, ShoppingBag, PlayCircle,
    BookOpen, Activity, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// 🔐 ADMIN CONFIG — hardcoded (frontend-only, keep private)
// ============================================================
const ADMIN_USER_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261", // ← you
];

// Notification types matching your Notifications component
const NOTIFICATION_TYPES = [
    { value: "system", label: "System", icon: Bell },
    { value: "quiz", label: "Question Bank", icon: Trophy },
    { value: "payment", label: "Billing", icon: CreditCard },
    { value: "housing", label: "Survival Hub", icon: Home },
    { value: "market", label: "Market", icon: ShoppingBag },
    { value: "video", label: "MedTube", icon: PlayCircle },
    { value: "flashcard", label: "Flashcards", icon: BookOpen },
    { value: "case", label: "Clinical Case", icon: Activity },
    { value: "paper", label: "Exam Paper", icon: FileText },
];

export function AdminNotificationPanel() {
    const user = useUser();
    const isAdmin = !!user && ADMIN_USER_IDS.includes(user.id);

    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMsg, setStatusMsg] = useState("");

    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("system");
    const [target, setTarget] = useState<"all" | "me">("all");
    const [typeOpen, setTypeOpen] = useState(false);

    // 🖥️ Desktop only — hide entirely on phones
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Reset status when user starts typing again
    useEffect(() => {
        if (status !== "idle") {
            setStatus("idle");
            setStatusMsg("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, message, type, target]);

    // Escape to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !sending) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, sending]);

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    // Don't render anything for non-admins or on phones
    if (!isAdmin || !isDesktop) return null;

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            setStatus("error");
            setStatusMsg("Title and message are required.");
            return;
        }

        setSending(true);
        setStatus("idle");
        setStatusMsg("");

        try {
            const payload = {
                title: title.trim(),
                message: message.trim(),
                type,
                // "all" → user_id NULL so every user sees it
                // "me"  → personal notification only for admin
                user_id: target === "all" ? null : user?.id,
                is_read: false,
                created_at: new Date().toISOString(),
            };

            const { error } = await supabase.from("notifications").insert(payload);

            if (error) throw error;

            setStatus("success");
            setStatusMsg(
                target === "all"
                    ? "Sent! Every user will see this on their next notification fetch."
                    : "Sent to you only."
            );

            setTitle("");
            setMessage("");
            setType("system");
            setTarget("all");
        } catch (err: any) {
            console.error("Send notification failed:", err);
            setStatus("error");
            setStatusMsg(err?.message || "Failed to send notification.");
        } finally {
            setSending(false);
        }
    };

    const selectedType =
        NOTIFICATION_TYPES.find((t) => t.value === type) ?? NOTIFICATION_TYPES[0];

    return (
        <>
            {/* Floating launcher — desktop only, no shadow, no border */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-48 right-5 z-[9999] group
                           flex items-center gap-2
                           px-4 py-3 rounded-full
                           bg-muted hover:bg-muted/80
                           text-foreground
                           transition-all hover:scale-105 active:scale-95"
                title="Admin: Send notification"
            >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold tracking-wide">
                    ADMIN
                </span>
            </button>

            {/* Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4"
                    onClick={() => !sending && setOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    <div
                        className="relative w-full md:max-w-lg
                                   bg-background
                                   rounded-t-3xl md:rounded-3xl
                                   max-h-[92vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 md:p-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm md:text-base font-bold text-foreground">
                                        Send Notification
                                    </h2>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">
                                        Admin-only broadcast
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => !sending && setOpen(false)}
                                disabled={sending}
                                className="p-2 rounded-full text-muted-foreground hover:text-foreground
                                           hover:bg-muted transition-colors disabled:opacity-40"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 md:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {/* Target selector */}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                                    Send to
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setTarget("all")}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all
                                            ${target === "all"
                                                ? "bg-blue-600 text-white"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <Globe className="w-4 h-4" />
                                        Everyone
                                    </button>
                                    <button
                                        onClick={() => setTarget("me")}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all
                                            ${target === "me"
                                                ? "bg-blue-600 text-white"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <User className="w-4 h-4" />
                                        Just me
                                    </button>
                                </div>
                            </div>

                            {/* Type dropdown */}
                            <div className="relative">
                                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                                    Type
                                </label>
                                <button
                                    onClick={() => setTypeOpen((o) => !o)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                                               bg-muted
                                               text-sm font-semibold text-foreground
                                               hover:bg-muted/80 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <selectedType.icon className="w-4 h-4 text-muted-foreground" />
                                        {selectedType.label}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform ${typeOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {typeOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 z-20
                                                    bg-popover
                                                    rounded-xl
                                                    max-h-64 overflow-y-auto custom-scrollbar">
                                        {NOTIFICATION_TYPES.map((t) => (
                                            <button
                                                key={t.value}
                                                onClick={() => {
                                                    setType(t.value);
                                                    setTypeOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left
                                                    hover:bg-muted transition-colors
                                                    ${t.value === type ? "bg-muted font-bold" : ""}`}
                                            >
                                                <t.icon className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-foreground">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. 7,000 new questions live!"
                                    maxLength={120}
                                    className="w-full px-3 py-2.5 rounded-xl
                                               bg-muted
                                               text-sm text-foreground
                                               placeholder:text-muted-foreground
                                               focus:bg-background
                                               focus:ring-2 focus:ring-blue-500/40
                                               outline-none transition-all"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                    {title.length}/120
                                </p>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                                    Message
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write the message users will see when they tap the notification..."
                                    rows={4}
                                    maxLength={600}
                                    className="w-full px-3 py-2.5 rounded-xl
                                               bg-muted
                                               text-sm text-foreground
                                               placeholder:text-muted-foreground
                                               focus:bg-background
                                               focus:ring-2 focus:ring-blue-500/40
                                               outline-none transition-all resize-none"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                    {message.length}/600
                                </p>
                            </div>

                            {/* Status */}
                            {status !== "idle" && (
                                <div
                                    className={`flex items-start gap-2.5 p-3 rounded-xl text-xs
                                        ${status === "success"
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                                            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                                        }`}
                                >
                                    {status === "success" ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    )}
                                    <span className="font-medium leading-relaxed">{statusMsg}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2.5 p-4 md:p-5 bg-muted/30">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={sending}
                                className="flex-1 rounded-xl border-0 bg-muted hover:bg-muted/80"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={sending || !title.trim() || !message.trim()}
                                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send {target === "all" ? "to Everyone" : "to Me"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}