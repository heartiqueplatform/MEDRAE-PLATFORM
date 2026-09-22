// src/components/ConnectTelegram.tsx
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, Loader2, X, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/* ---------- Official Telegram logo (inline SVG) ---------- */
function TelegramLogo({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="tgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2AABEE" />
                    <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#tgGrad)" />
            <path
                fill="#FFFFFF"
                d="M54.3 118.3l139.1-53.6c6.5-2.4 12.2 1.6 10.1 11.5l-23.7 111.6c-1.8 8.1-6.6 10.1-13.4 6.3l-37-27.3-17.8 17.2c-2 2-3.6 3.6-7.4 3.6l2.7-37.7 68.7-62c3-2.7-.7-4.2-4.6-1.6l-84.9 53.5-36.6-11.4c-7.9-2.5-8.1-7.9 1.8-11.1z"
            />
        </svg>
    );
}

interface ConnectTelegramProps {
    open: boolean;
    onClose: () => void;
}

type LinkState =
    | { status: "loading" }
    | { status: "linked"; username: string | null }
    | { status: "code"; code: string; expiresAt: string; deepLink: string; command: string }
    | { status: "error"; message: string };

export function ConnectTelegram({ open, onClose }: ConnectTelegramProps) {
    const { toast } = useToast();
    const [state, setState] = useState<LinkState>({ status: "loading" });
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const generate = useCallback(async () => {
        setState({ status: "loading" });
        try {
            const { data, error } = await supabase.functions.invoke("telegram-link", {
                method: "POST",
            });

            if (error) throw error;

            if (data?.already_linked) {
                setState({
                    status: "linked",
                    username: data.telegram_username ?? null,
                });
                return;
            }

            if (!data?.ok || !data?.code) {
                throw new Error(data?.error ?? "Could not generate code");
            }

            setState({
                status: "code",
                code: data.code,
                expiresAt: data.expires_at,
                deepLink: data.deep_link,
                command: data.command,
            });
        } catch (err) {
            console.error(err);
            setState({
                status: "error",
                message: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }, []);

    useEffect(() => {
        if (open) {
            setCopied(false);
            generate();
        }
    }, [open, generate]);

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

    const copyCommand = useCallback(async () => {
        if (state.status !== "code") return;
        try {
            await navigator.clipboard.writeText(state.command);
            setCopied(true);
            toast({ title: "Copied!", description: state.command });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ title: "Copy failed", variant: "destructive" });
        }
    }, [state, toast]);

    if (!mounted || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] flex items-stretch sm:items-center sm:justify-center"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div
                className="
          relative z-10 flex flex-col
          w-full h-[100dvh] max-h-[100dvh]
          animate-in slide-in-from-bottom duration-300
          sm:h-auto sm:max-h-[85vh] sm:w-[440px] sm:rounded-2xl sm:shadow-2xl
          bg-gray-50 dark:bg-[#0d1117]
          sm:bg-white dark:sm:bg-[#161b22]
          pt-[max(1.25rem,env(safe-area-inset-top))]
          pb-[max(2rem,env(safe-area-inset-bottom))]
          px-4 sm:px-6 sm:pt-5 sm:pb-6
          overflow-y-auto custom-scrollbar
        "
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-sm">
                            <TelegramLogo className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                            Connect Telegram
                        </h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-[#21262d]"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                </div>

                {/* Body */}
                {state.status === "loading" && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#229ED9]" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Preparing your code…
                        </p>
                    </div>
                )}

                {state.status === "error" && (
                    <div className="py-10 text-center">
                        <p className="text-sm text-red-500 mb-4">{state.message}</p>
                        <Button onClick={generate} className="rounded-xl">
                            Try again
                        </Button>
                    </div>
                )}

                {state.status === "linked" && (
                    <div className="py-10 text-center">
                        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 mb-4">
                            <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            Already connected
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {state.username
                                ? `Linked to @${state.username}`
                                : "Your Telegram is linked to this account."}
                        </p>
                    </div>
                )}

                {state.status === "code" && (
                    <div className="space-y-5">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            Open Telegram, start a chat with{" "}
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                @MedraeNursingBot
                            </span>
                            , and send this command:
                        </p>

                        <div className="rounded-2xl bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <code className="text-lg font-mono font-bold tracking-wider text-gray-800 dark:text-gray-100 truncate">
                                    {state.command}
                                </code>
                                <Button
                                    size="sm"
                                    variant={copied ? "default" : "outline"}
                                    onClick={copyCommand}
                                    className="rounded-xl shrink-0"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-1" /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-1" /> Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <a
                            href={state.deepLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl
                bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#229ED9] hover:to-[#1f8fc4]
                text-white text-sm font-bold transition-all shadow-sm hover:shadow-md"
                        >
                            <TelegramLogo className="w-5 h-5" />
                            Open Telegram
                            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </a>

                        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                            Code expires in 10 minutes. Single use.
                        </p>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}