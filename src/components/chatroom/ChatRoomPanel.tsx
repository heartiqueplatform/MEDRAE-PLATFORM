// src/components/chatroom/ChatRoomPanel.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Check, MessageCircle, X, Edit2, Trash2, CornerUpLeft } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { Message, Unit, LayoutMode } from "./types";

interface Props {
    activeUnit: string | null;
    activeUnitData: Unit | undefined;
    messages: Message[];
    currentUserId: string | undefined;
    layout: LayoutMode;
    onBack: () => void;
    onClose?: () => void;
    onSend: (unitCode: string, content: string, replyToId?: number | null) => void;
    onEdit: (unitCode: string, id: number, newContent: string) => void;
    onDelete: (unitCode: string, id: number) => void;
}

export default function ChatRoomPanel({
    activeUnit,
    activeUnitData,
    messages,
    currentUserId,
    layout,
    onBack,
    onClose,
    onSend,
    onEdit,
    onDelete,
}: Props) {
    const [input, setInput] = useState("");
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const emojiRef = useRef<HTMLDivElement | null>(null);
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    useEffect(() => {
        if (!emojiOpen) return;
        const h = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [emojiOpen]);

    // ✅ Lock panel height to the VISUAL viewport (fixes iOS/Android keyboard push)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const vv = window.visualViewport;
        const updateHeight = () => {
            const h = vv ? vv.height : window.innerHeight;
            document.documentElement.style.setProperty("--chat-panel-height", `${h}px`);
        };
        updateHeight();
        if (vv) {
            vv.addEventListener("resize", updateHeight);
            vv.addEventListener("scroll", updateHeight);
        } else {
            window.addEventListener("resize", updateHeight);
        }
        return () => {
            if (vv) {
                vv.removeEventListener("resize", updateHeight);
                vv.removeEventListener("scroll", updateHeight);
            } else {
                window.removeEventListener("resize", updateHeight);
            }
            document.documentElement.style.removeProperty("--chat-panel-height");
        };
    }, []);

    // ── Empty state (no unit selected) ─────────────────────────
    if (!activeUnit) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 bg-white dark:bg-[#0d1117]">
                <div className="p-6 bg-gray-50 dark:bg-[#21262d] rounded-full">
                    <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Select a unit</p>
            </div>
        );
    }

    const handleSend = () => {
        if (!input.trim() || !activeUnit) return;
        onSend(activeUnit, input, replyingTo?.id || null);
        setInput("");
        setReplyingTo(null);
    };

    // ✅ Unit avatar in header — same image as the chat list
    const headerAvatar = activeUnitData?.image_url?.trim()
        ? activeUnitData.image_url
        : null;

    return (
        <div
            className="flex flex-col min-h-0 w-full overflow-hidden relative bg-white dark:bg-[#0d1117]"
            style={{ height: "var(--chat-panel-height, 100%)" }}
        >
            {/* HEADER — fixed, never scrolls */}
            <div className="flex-none bg-white dark:bg-[#161b22] px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">

                    {/* ✅ Unit avatar — WhatsApp / Instagram style */}
                    <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d]">
                            {headerAvatar ? (
                                <img
                                    src={headerAvatar}
                                    alt={activeUnitData?.title || "unit"}
                                    className="h-full w-full object-cover"
                                    draggable={false}
                                    loading="eager"
                                    decoding="async"
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[13px] font-bold">
                                    {(activeUnitData?.title || activeUnit || "U").substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {/* online dot */}
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#161b22] bg-emerald-500" />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {activeUnitData?.title || activeUnit}
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Active</span>
                        </div>
                    </div>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all shrink-0 active:scale-90"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* MESSAGES — only this scrolls */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-4 bg-gray-50 dark:bg-[#0d1117]"
                style={{ touchAction: "pan-y" }}
            >
                {messages.length === 0 ? (
                    <div className="h-full min-h-[450px] flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-28 w-28 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d] mb-6">
                            {headerAvatar ? (
                                <img
                                    src={headerAvatar}
                                    alt="Unit Roster"
                                    className="h-full w-full object-cover"
                                    loading="eager"
                                    decoding="async"
                                />
                            ) : (
                                <img src="/background05.jpg" alt="Unit Roster" className="h-full w-full object-cover" />
                            )}
                        </div>
                        <div className="space-y-2 px-6">
                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                                {activeUnitData?.title || activeUnit}
                            </h3>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#21262d]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">New discussion</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 max-w-[240px] leading-relaxed">
                                No messages yet. Be the first to start the discussion.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col py-6 space-y-4">
                        {messages.map((msg, idx) => {
                            const isMe = msg.user_id === currentUserId;
                            const prevMsg = messages[idx - 1];
                            const isSameSender = prevMsg && prevMsg.user_id === msg.user_id;
                            const originalMsg = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null;
                            const replyingToName = originalMsg?.user_id === currentUserId ? "You" : originalMsg?.sender_name;

                            return (
                                <div
                                    key={msg.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedMessage((p) => (p === msg.id ? null : msg.id)); }}
                                    className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row", !isSameSender ? "mt-6" : "mt-1")}
                                >
                                    <Avatar className="h-12 w-12 shrink-0">
                                        {msg.avatar_url ? (
                                            <img src={msg.avatar_url} alt={msg.sender_name || "avatar"} className="h-full w-full object-cover" />
                                        ) : (
                                            <AvatarFallback className="bg-gray-200 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 text-xs font-semibold">
                                                {msg.sender_name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                                        {!isSameSender && (
                                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 px-1">
                                                {isMe ? "You" : msg.sender_name}
                                            </span>
                                        )}
                                        <div className="relative group">
                                            <div className={cn(
                                                "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                                                isMe
                                                    ? "bg-gray-800 dark:bg-[#21262d] text-white dark:text-gray-200 rounded-tr-none"
                                                    : "bg-white dark:bg-[#161b22] text-gray-800 dark:text-gray-200 rounded-tl-none"
                                            )}>
                                                {msg.replyToId && (
                                                    <div className={cn(
                                                        "mb-2 p-2 rounded-lg text-[10px] font-medium truncate",
                                                        isMe ? "bg-white/10 text-white/80" : "bg-gray-50 dark:bg-[#21262d] text-gray-500 dark:text-gray-400"
                                                    )}>
                                                        <span className="block opacity-70 mb-0.5">
                                                            {msg.sender_name} replied to {replyingToName}
                                                        </span>
                                                        "{msg.replyToContent || "Referenced message"}"
                                                    </div>
                                                )}
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <div className="mt-1 flex items-center justify-end gap-1 opacity-50 text-[9px] font-medium">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    {isMe && <Check className="h-2.5 w-2.5" />}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setReplyingTo(msg)}
                                                className={cn(
                                                    "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
                                                    isMe ? "-left-8" : "-right-8"
                                                )}
                                            >
                                                <CornerUpLeft size={14} />
                                            </button>
                                            {!msg.deleted && selectedMessage === msg.id && (
                                                <div
                                                    className="absolute -top-10 right-0 z-50 flex items-center gap-1 p-1 bg-white dark:bg-[#21262d] rounded-xl"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        title="Edit"
                                                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] rounded-lg transition-colors"
                                                        onClick={() => {
                                                            const nc = prompt("Edit message:", msg.content);
                                                            if (nc && nc !== msg.content && activeUnit) onEdit(activeUnit, msg.id, nc);
                                                        }}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        title="Delete"
                                                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] rounded-lg transition-colors"
                                                        onClick={() => {
                                                            if (window.confirm("Delete this message?") && activeUnit) onDelete(activeUnit, msg.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        title="Close"
                                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                                                        onClick={() => setSelectedMessage(null)}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={endRef} className="h-2" />
                    </div>
                )}
            </div>

            {/* COMPOSER — fixed at bottom, never scrolls */}
            <div className="flex-none relative bg-white dark:bg-[#161b22]">
                {replyingTo && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-[#21262d] flex justify-between items-center">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-8 w-0.5 bg-gray-400 dark:bg-gray-600 rounded-full" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                    Replying to {replyingTo.sender_name}
                                </span>
                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate italic">
                                    "{replyingTo.content}"
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors"
                        >
                            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                )}
                <div className="p-3 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Input
                            value={input}
                            placeholder="Type a message…"
                            className="rounded-2xl h-12 bg-gray-50 dark:bg-[#21262d] border-0 px-5 text-sm focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-[#30363d] pr-12 transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />
                        <button
                            type="button"
                            onClick={() => setEmojiOpen((v) => !v)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            😊
                        </button>
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="h-12 w-12 rounded-2xl bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white transition-all active:scale-90 border-0"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* EMOJI PICKER */}
            {emojiOpen && (
                <div ref={emojiRef} className="absolute bottom-20 right-4 z-[30] rounded-2xl overflow-hidden">
                    <EmojiPicker
                        onEmojiClick={(d) => { setInput((p) => p + d.emoji); setEmojiOpen(false); }}
                        theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
                        width={280}
                        height={350}
                    />
                </div>
            )}
        </div>
    );
}