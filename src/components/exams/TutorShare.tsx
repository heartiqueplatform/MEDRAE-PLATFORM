// components/TutorShare.tsx
"use client";

import { useState } from "react";
import {
    Share2,
    ChevronRight,
    Copy,
    Check,
    MessageCircle,
    Send,
    Mail,
    Phone,
} from "lucide-react";
import { toast } from "sonner";
import { tap } from "@/lib/tutor/tap";
import { CenteredModal } from "@/components/ui/CenteredModal";

const SITE_URL = "https://medrae.vercel.app/dashboard";
const CONTACT_EMAIL = "medraenursing@gmail.com";
const CONTACT_PHONE = "0717517371";
const CONTACT_WA = "254703473503";

const SHARE_TEXT = `📚 Join MEDRAE — Kenya's nursing learning platform.

✓ Premium notes & resources
✓ NCK-aligned simulation exams
✓ AI study assistant
✓ Progress tracking & quizzes

Join here: ${SITE_URL}`;

export function TutorShare() {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(SITE_URL);
            setCopied(true);
            toast.success("Link copied");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Could not copy link");
        }
    };

    const openWhatsApp = () => {
        tap();
        window.open(`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`, "_blank");
    };
    const openSMS = () => {
        tap();
        window.open(`sms:?body=${encodeURIComponent(`Join MEDRAE: ${SITE_URL}`)}`, "_blank");
    };
    const openEmail = () => {
        tap();
        const subject = "Join MEDRAE Nursing Platform";
        const body = `Hello!\n\nI'm inviting you to join MEDRAE — Kenya's nursing learning platform.\n\n${SHARE_TEXT}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <>
            <section className="space-y-2">
                <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Invite
                </h2>

                <button
                    onClick={() => {
                        tap();
                        setOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#161b22] active:scale-[0.99] transition-transform text-left"
                    style={{ touchAction: "manipulation" }}
                >
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Share2 className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            Invite students
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Share MEDRAE, request a custom exam
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={2.5} />
                </button>
            </section>

            <CenteredModal
                open={open}
                onClose={() => setOpen(false)}
                title="Invite students"
                subtitle="Share the platform or request a custom exam"
            >
                <div className="p-3 space-y-3">
                    {/* Link + copy */}
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Platform link
                            </div>
                            <div className="text-[11px] font-mono text-slate-900 dark:text-white truncate">
                                {SITE_URL}
                            </div>
                        </div>
                        <button
                            onClick={copy}
                            className="h-8 px-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold active:scale-[0.97] flex items-center gap-1 shrink-0"
                            style={{ touchAction: "manipulation" }}
                        >
                            {copied ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : (
                                <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
                            )}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    {/* Share row */}
                    <div className="grid grid-cols-3 gap-2">
                        <ShareBtn
                            label="WhatsApp"
                            accent="emerald"
                            icon={<MessageCircle className="h-4 w-4" strokeWidth={2.5} />}
                            onClick={openWhatsApp}
                        />
                        <ShareBtn
                            label="SMS"
                            accent="blue"
                            icon={<Send className="h-4 w-4" strokeWidth={2.5} />}
                            onClick={openSMS}
                        />
                        <ShareBtn
                            label="Email"
                            accent="slate"
                            icon={<Mail className="h-4 w-4" strokeWidth={2.5} />}
                            onClick={openEmail}
                        />
                    </div>

                    {/* Custom exam contact */}
                    <div className="rounded-xl bg-amber-500/10 p-3 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Need a custom exam?
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            We'll build an assessment around your unit and your students' weak areas.
                        </p>
                        <div className="flex flex-col gap-1.5">
                            <ContactRow
                                icon={<Mail className="h-3.5 w-3.5" strokeWidth={2.5} />}
                                label={CONTACT_EMAIL}
                                href={`mailto:${CONTACT_EMAIL}`}
                            />
                            <ContactRow
                                icon={<Phone className="h-3.5 w-3.5" strokeWidth={2.5} />}
                                label={CONTACT_PHONE}
                                href={`tel:${CONTACT_PHONE}`}
                            />
                            <ContactRow
                                icon={<Phone className="h-3.5 w-3.5" strokeWidth={2.5} />}
                                label={`${CONTACT_WA} (WhatsApp)`}
                                href={`https://wa.me/${CONTACT_WA}`}
                            />
                        </div>
                    </div>
                </div>
            </CenteredModal>
        </>
    );
}

function ShareBtn({
    label,
    icon,
    accent,
    onClick,
}: {
    label: string;
    icon: React.ReactNode;
    accent: "emerald" | "blue" | "slate";
    onClick: () => void;
}) {
    const cls =
        accent === "emerald"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : accent === "blue"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "bg-slate-500/10 text-slate-600 dark:text-slate-300";

    return (
        <button
            onClick={onClick}
            className={`h-16 rounded-xl ${cls} flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform`}
            style={{ touchAction: "manipulation" }}
        >
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}

function ContactRow({
    icon,
    label,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    href: string;
}) {
    return (
        <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            onClick={() => tap()}
            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white dark:bg-[#161b22] text-[11px] font-semibold text-slate-700 dark:text-slate-300 active:scale-[0.99]"
            style={{ touchAction: "manipulation" }}
        >
            <span className="text-amber-600 dark:text-amber-400">{icon}</span>
            <span className="truncate">{label}</span>
        </a>
    );
}