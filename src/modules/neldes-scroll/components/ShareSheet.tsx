// src/modules/neldes-scroll/components/ShareSheet.tsx
// ============================================================
// Neldes Scroll — share target sheet.
// Uses CenteredModal for mobile-sheet + desktop-modal behavior.
// ============================================================

import { MessageCircle, Instagram, Copy, Link2 } from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import type { FeedPost, ShareTarget } from "../types";
import { NELDES_COLORS } from "../config/constants";
import { NeldesModal } from "./NeldesModal";

interface ShareSheetProps {
    open: boolean;
    post: FeedPost | null;
    onClose: () => void;
    onShare: (target: ShareTarget) => void;
}

const TARGETS: {
    key: ShareTarget;
    label: string;
    icon: React.ReactNode;
    bg: string;
}[] = [
        {
            key: "whatsapp_status",
            label: "WhatsApp Status",
            icon: <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />,
            bg: "linear-gradient(135deg,#25D366,#128C7E)",
        },
        {
            key: "whatsapp",
            label: "WhatsApp",
            icon: <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />,
            bg: "linear-gradient(135deg,#25D366,#128C7E)",
        },
        {
            key: "instagram",
            label: "Instagram",
            icon: <Instagram className="w-5 h-5 text-white" strokeWidth={2} />,
            bg: "linear-gradient(135deg,#E1306C,#F77737,#FCAF45)",
        },
        {
            key: "tiktok",
            label: "TikTok",
            icon: <span className="text-white font-black text-[15px]">♪</span>,
            bg: "linear-gradient(135deg,#000000,#25F4EE)",
        },
        {
            key: "copy_link",
            label: "Copy Link",
            icon: <Link2 className="w-5 h-5 text-white" strokeWidth={2} />,
            bg: "linear-gradient(135deg,#58a6ff,#1f6feb)",
        },
    ];

export function ShareSheet({ open, post, onClose, onShare }: ShareSheetProps) {
    return (
        <NeldesModal
            open={open}
            onClose={onClose}
            title="Share"
            maxWidthClass="max-w-md"
            forceDark
        >
            <div className="px-4 pb-2">
                <div className="grid grid-cols-4 gap-3">
                    {TARGETS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => onShare(t.key)}
                            disabled={!post}
                            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
                            style={{ touchAction: "manipulation" }}
                        >
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: t.bg }}
                            >
                                {t.icon}
                            </div>
                            <span
                                className="text-[10px] font-semibold text-center leading-tight"
                                style={{ color: NELDES_COLORS.textSecondary }}
                            >
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>

                {post?.image_url && (
                    <button
                        onClick={() => onShare("whatsapp_status")}
                        className="mt-4 w-full h-12 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        style={{
                            background: "linear-gradient(135deg,#25D366,#128C7E)",
                            touchAction: "manipulation",
                        }}
                    >
                        <Copy className="w-4 h-4 text-white" strokeWidth={2.4} />
                        <span className="text-[13px] font-bold text-white">
                            Share to WhatsApp Status
                        </span>
                    </button>
                )}
            </div>
        </NeldesModal>
    );
}