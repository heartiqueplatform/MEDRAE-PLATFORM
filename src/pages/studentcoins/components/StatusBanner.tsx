// src/pages/studentcoins/components/StatusBanner.tsx

import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import type { Enrollment } from "../types";

interface Props {
    enrollment: Enrollment;
    applying: boolean;
    onApply: () => void;
}

export function StatusBanner({ enrollment, applying, onApply }: Props) {
    if (!enrollment) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-orange-50
                   dark:from-amber-500/10 dark:to-orange-500/10
                   border border-amber-200/60 dark:border-amber-500/20"
            >
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-amber-900 dark:text-amber-200">
                            Apply to earn coins
                        </p>
                        <p className="text-[11.5px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-snug">
                            Applications are reviewed by our team. Once approved, you start earning instantly.
                        </p>
                        <button
                            onClick={onApply}
                            disabled={applying}
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-amber-600 hover:bg-amber-700 disabled:opacity-50
                         text-white text-[12px] font-bold
                         active:scale-95 transition-transform"
                        >
                            {applying ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                    <span className="truncate">Applying…</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Apply now</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (enrollment.status === "pending") {
        return (
            <BannerRow
                tone="amber"
                icon={Clock}
                title="Application under review"
                subtitle="We're reviewing your application. You'll be notified within 24 hours."
            />
        );
    }

    if (enrollment.status === "rejected") {
        return (
            <BannerRow
                tone="rose"
                icon={XCircle}
                title="Application declined"
                subtitle={enrollment.notes || "Please contact support for more details."}
            />
        );
    }

    if (enrollment.status === "suspended") {
        return (
            <BannerRow
                tone="rose"
                icon={AlertTriangle}
                title="Earning paused"
                subtitle={enrollment.notes || "Your earning privileges have been suspended."}
            />
        );
    }

    if (enrollment.status === "approved") {
        return (
            <BannerRow
                tone="emerald"
                icon={CheckCircle2}
                title="You're approved!"
                subtitle="Start participating in the community to earn coins."
            />
        );
    }

    return null;
}

function BannerRow({
    tone,
    icon: Icon,
    title,
    subtitle,
}: {
    tone: "amber" | "rose" | "emerald";
    icon: any;
    title: string;
    subtitle: string;
}) {
    const styles = {
        amber: {
            bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20",
            iconBg: "bg-amber-500/15",
            iconColor: "text-amber-600 dark:text-amber-400",
            titleColor: "text-amber-900 dark:text-amber-200",
            subColor: "text-amber-700/80 dark:text-amber-300/80",
        },
        rose: {
            bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20",
            iconBg: "bg-rose-500/15",
            iconColor: "text-rose-600 dark:text-rose-400",
            titleColor: "text-rose-900 dark:text-rose-200",
            subColor: "text-rose-700/80 dark:text-rose-300/80",
        },
        emerald: {
            bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20",
            iconBg: "bg-emerald-500/15",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            titleColor: "text-emerald-900 dark:text-emerald-200",
            subColor: "text-emerald-700/80 dark:text-emerald-300/80",
        },
    }[tone];

    /* Truncate long admin notes (200 chars is enough for a banner) */
    const safeSubtitle =
        subtitle.length > 200 ? `${subtitle.slice(0, 200).trimEnd()}…` : subtitle;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 border ${styles.bg}`}
        >
            <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}>
                    <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold ${styles.titleColor} truncate`}>
                        {title}
                    </p>
                    <p
                        className={`text-[11.5px] mt-0.5 leading-snug ${styles.subColor} break-words`}
                    >
                        {safeSubtitle}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}