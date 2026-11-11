// src/components/grouppay/GroupCard.tsx

import {
    StudyGroup,
    GROUPPAY_CONFIG,
    GroupDuration,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";
import { Progress } from "@/components/ui/progress";
import {
    Users,
    User,
    Lock,
    Unlock,
    Calendar,
    Crown,
    Phone,
    Sparkles,
    TrendingDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else navigator.vibrate(12);
    }
};

interface GroupCardProps {
    group: StudyGroup;
    onJoin?: (groupId: string) => void;
    isMember?: boolean;
    userRole?: "leader" | "member" | null;
    currentUserId?: string;
}

export function GroupCard({
    group,
    onJoin,
    isMember,
    userRole,
    currentUserId,
}: GroupCardProps) {
    const navigate = useNavigate();

    /* ── Derived values ─────────────────────────────────── */
    const durationType: GroupDuration =
        group.duration_type === "1-month" ? "1-month" : "2-months";
    const durationLabel = durationType === "1-month" ? "1 month" : "2 months";

    const pricePerMember =
        group.price_per_member ??
        group.contribution_per_member ??
        getGroupPricePerMember(durationType);
    const individualPrice = getIndividualPrice(durationType);
    const savingsPerMember = getSavingsPerMember(durationType);

    const currentMembers = group.current_members ?? 0;
    const maxMembers = group.max_members ?? 0;
    const progress =
        maxMembers > 0 ? (currentMembers / maxMembers) * 100 : 0;
    const isFull = currentMembers >= maxMembers && maxMembers > 0;
    const readyToActivate = isFull && group.status !== "active";

    const isCreator = currentUserId === group.created_by;
    const memberStatus =
        isMember !== undefined
            ? isMember
            : group.members?.some((m) => m.user_id === currentUserId) || false;
    const role =
        userRole ||
        group.members?.find((m) => m.user_id === currentUserId)?.role ||
        null;

    const hasContactInfo = !!(
        group.leader_phone ||
        group.leader_whatsapp ||
        group.leader_email
    );

    const handleCardClick = () => {
        tap();
        navigate(`/grouppay/${group.id}`);
    };

    const handleJoinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        tap("success");
        onJoin?.(group.id);
    };

    /* ── Status pill colors — token palette only ────────── */
    const statusTone = {
        open: "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400",
        payment_pending:
            "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
        active:
            "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
        closed:
            "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300",
    }[group.status];

    return (
        <article
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
            className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5
                       cursor-pointer active:scale-[0.995] transition-transform
                       focus:outline-none"
            style={{ touchAction: "manipulation" }}
        >
            {/* ── Title row + lock pill ──────────────────── */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white
                                   leading-snug line-clamp-1">
                        {group.group_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400
                                  line-clamp-1 mt-0.5">
                        {group.school}
                    </p>
                </div>
                <span
                    className={`shrink-0 inline-flex items-center gap-1
                                bg-slate-100 dark:bg-white/[0.06]
                                text-slate-600 dark:text-slate-300
                                text-[9px] font-bold uppercase tracking-wider
                                px-2 py-0.5 rounded-full`}
                >
                    {group.is_locked ? (
                        <Lock className="h-2.5 w-2.5" />
                    ) : (
                        <Unlock className="h-2.5 w-2.5" />
                    )}
                    {group.is_locked ? "Locked" : "Open"}
                </span>
            </div>

            {/* ── Duration + savings + Ready ─────────────── */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-violet-50 dark:bg-violet-400/10
                                 text-violet-700 dark:text-violet-400
                                 text-[9px] font-bold uppercase tracking-wider
                                 px-1.5 py-0.5 rounded-full">
                    {durationLabel}
                </span>
                {savingsPerMember > 0 && (
                    <span className="inline-flex items-center gap-1
                                     bg-emerald-50 dark:bg-emerald-400/10
                                     text-emerald-700 dark:text-emerald-400
                                     text-[9px] font-bold uppercase tracking-wider
                                     px-1.5 py-0.5 rounded-full">
                        <TrendingDown className="h-2.5 w-2.5" />
                        Save {GROUPPAY_CONFIG.CURRENCY} {savingsPerMember}
                    </span>
                )}
                {readyToActivate && (
                    <span className="inline-flex items-center gap-1
                                     bg-emerald-600 text-white
                                     text-[9px] font-bold uppercase tracking-wider
                                     px-1.5 py-0.5 rounded-full">
                        <Sparkles className="h-2.5 w-2.5" />
                        Ready
                    </span>
                )}
            </div>

            {/* ── Creator + contact ──────────────────────── */}
            <div className="flex items-center gap-1.5
                            text-[11px] text-slate-500 dark:text-slate-400">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">
                    {group.creator?.name || "Unknown"}
                </span>
                {isCreator && (
                    <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                )}
                {hasContactInfo && (
                    <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="ml-auto shrink-0 text-[10px]">
                    {formatDistanceToNow(new Date(group.created_at), {
                        addSuffix: true,
                    })}
                </span>
            </div>

            {/* ── Members + progress ─────────────────────── */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-[12px] font-bold
                                         text-slate-900 dark:text-white tabular-nums">
                            {currentMembers}
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                                {" / "}
                                {maxMembers}
                            </span>
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {Math.round(progress)}%
                    </span>
                </div>

                <Progress
                    value={Math.min(progress, 100)}
                    className="h-1"
                />

                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isFull
                        ? "Group is full"
                        : `${maxMembers - currentMembers} slot${maxMembers - currentMembers !== 1 ? "s" : ""
                        } left`}
                </p>
            </div>

            {/* ── Description ────────────────────────────── */}
            {group.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400
                              line-clamp-2 leading-snug">
                    {group.description}
                </p>
            )}

            {/* ── Price row ──────────────────────────────── */}
            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5
                            flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider
                                 text-slate-500 dark:text-slate-400">
                    Per member
                </span>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-bold tabular-nums
                                     text-emerald-600 dark:text-emerald-400">
                        {GROUPPAY_CONFIG.CURRENCY} {pricePerMember}
                    </span>
                    {individualPrice > pricePerMember && (
                        <span className="text-[10px] line-through tabular-nums
                                         text-slate-400 dark:text-slate-500">
                            {GROUPPAY_CONFIG.CURRENCY} {individualPrice}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Status pill (when not "open") ──────────── */}
            {group.status !== "open" && (
                <span className={`inline-flex items-center gap-1
                                  text-[10px] font-bold uppercase tracking-wider
                                  px-2 py-0.5 rounded-full
                                  ${statusTone}`}>
                    {group.status === "active" && (
                        <Sparkles className="h-2.5 w-2.5" />
                    )}
                    {group.status === "payment_pending" && (
                        <Calendar className="h-2.5 w-2.5" />
                    )}
                    {group.status === "closed" && (
                        <Lock className="h-2.5 w-2.5" />
                    )}
                    {group.status.replace("_", " ")}
                </span>
            )}

            {/* ── Footer: code + action ──────────────────── */}
            <div className="flex items-center justify-between gap-2
                            pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="text-[10px] text-slate-500 dark:text-slate-400
                                truncate min-w-0">
                    Code:{" "}
                    <span className="font-mono font-bold
                                     text-slate-900 dark:text-white">
                        {group.group_code}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {!memberStatus &&
                        !isFull &&
                        group.status !== "closed" &&
                        !group.is_locked && (
                            <button
                                onClick={handleJoinClick}
                                className="h-8 px-3 rounded-lg
                                           bg-slate-900 dark:bg-white
                                           text-white dark:text-slate-900
                                           text-[11px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Join
                            </button>
                        )}

                    {memberStatus && (
                        <span
                            className={`inline-flex items-center gap-1
                                        text-[10px] font-bold uppercase tracking-wider
                                        px-2 py-0.5 rounded-full
                                        ${role === "leader"
                                    ? "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400"
                                    : "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                                }`}
                        >
                            {role === "leader" && <Crown className="h-2.5 w-2.5" />}
                            {role === "leader" ? "Leader" : "Member"}
                        </span>
                    )}

                    {isFull && !memberStatus && (
                        <span className="bg-slate-100 dark:bg-white/[0.06]
                                         text-slate-600 dark:text-slate-300
                                         text-[10px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full">
                            Full
                        </span>
                    )}

                    {group.status === "closed" && !memberStatus && (
                        <span className="bg-slate-100 dark:bg-white/[0.06]
                                         text-slate-600 dark:text-slate-300
                                         text-[10px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full">
                            Closed
                        </span>
                    )}

                    {group.is_locked && !memberStatus && group.status !== "closed" && (
                        <span className="bg-rose-50 dark:bg-rose-400/10
                                         text-rose-700 dark:text-rose-400
                                         text-[10px] font-bold uppercase tracking-wider
                                         px-2 py-0.5 rounded-full">
                            Locked
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}