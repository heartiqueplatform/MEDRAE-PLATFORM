// components/tutor/ConnectCards.tsx
import { Share2, MessageCircle, Send, Facebook } from "lucide-react";
import { ConnectCard, type ConnectCardProps } from "./ConnectCard";
import { toast } from "sonner";

const SHARE_URL = "https://medrae.vercel.app";
const SHARE_MESSAGE = `Medrae – The Professional Medical Education & Career Network

• Structured modules
• Expert-led lectures
• NCK Exam Prep

Join today: ${SHARE_URL}`;

function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
        navigator.share({
            title: "Medrae Network",
            text: SHARE_MESSAGE,
            url: SHARE_URL,
        }).catch(() => {
            /* user cancelled */
        });
    } else {
        navigator.clipboard
            .writeText(SHARE_MESSAGE)
            .then(() => toast.success("Link copied to clipboard"))
            .catch(() => toast.error("Could not copy link"));
    }
}

const CARDS: ConnectCardProps[] = [
    {
        title: "Share Medrae",
        description: "Invite colleagues to Kenya's network for medical education and career growth.",
        icon: <Share2 className="h-4 w-4" strokeWidth={2.5} />,
        accent: "blue",
        actions: [{ label: "Spread the Word", onClick: handleShare, accent: "blue", variant: "solid" }],
    },
    {
        title: "Official Channel",
        description: "Instant updates on new study content and announcements.",
        icon: <MessageCircle className="h-4 w-4" strokeWidth={2.5} />,
        accent: "emerald",
        actions: [
            {
                label: "Join Channel",
                href: "https://whatsapp.com/channel/0029VbBFzgAEawdkJKtRtF2H",
                accent: "emerald",
                variant: "ghost",
            },
        ],
    },
    {
        title: "Student Community",
        description: "Connect with peers, share resources, and ask questions in real time.",
        icon: <Send className="h-4 w-4" strokeWidth={2.5} />,
        accent: "sky",
        actions: [
            {
                label: "Join WhatsApp Group",
                href: "https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV",
                accent: "sky",
                variant: "ghost",
            },
        ],
    },
    {
        title: "Telegram & Facebook",
        description: "Access the full repository of nursing and medical scholarship materials.",
        icon: <Facebook className="h-4 w-4" strokeWidth={2.5} />,
        accent: "violet",
        actions: [
            {
                label: "Telegram",
                href: "https://t.me/heartiquenursingnexusscholar",
                accent: "violet",
                variant: "ghost",
            },
            {
                label: "Facebook",
                href: "https://web.facebook.com/share/g/1AY4nC9Hcp/",
                accent: "violet",
                variant: "ghost",
            },
        ],
    },
];

export function ConnectCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CARDS.map((c) => (
                <ConnectCard key={c.title} {...c} />
            ))}
        </div>
    );
}