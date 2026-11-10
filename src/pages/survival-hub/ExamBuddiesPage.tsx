import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
import { useAuth } from "@/context/AuthProvider";
import {
    ChevronLeft,
    Users,
    Loader2,
    UserPlus,
    UserMinus,
    BedDouble,
    BookOpen,
    MessageSquare,
    GraduationCap,
    Phone,
    CheckCircle2,
    X,
    ArrowLeftRight,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

const ExamBuddiesPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [userGlobalStatus, setUserGlobalStatus] = useState<any>(null);
    const centerId = searchParams.get("centerId");
    const centerName = searchParams.get("name");

    const [buddies, setBuddies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);

    const [showJoinModal, setShowJoinModal] = useState(false);
    const [phone, setPhone] = useState("");
    const [prefRoommate, setPrefRoommate] = useState(false);
    const [prefStudy, setPrefStudy] = useState(false);

    const currentCycle = "June 2024";

    const fetchData = useCallback(async () => {
        if (!centerId || !user?.id) return;
        try {
            setLoading(true);
            const data = await survivalApi.getExamBuddies(centerId);
            setBuddies(data || []);

            const globalStatus = await survivalApi.getUserRegistrationStatus(
                user.id,
                currentCycle
            );
            setUserGlobalStatus(globalStatus);

            if (globalStatus?.whatsapp_number) {
                setPhone(globalStatus.whatsapp_number);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [centerId, user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const isRegisteredHere = userGlobalStatus?.exam_center_id === centerId;
    const isRegisteredElsewhere =
        userGlobalStatus && userGlobalStatus.exam_center_id !== centerId;

    const cleanPhone = (val: string) => {
        let num = val.replace(/\D/g, "");
        if (num.startsWith("0")) num = "254" + num.substring(1);
        return num;
    };

    const handleJoinSubmit = async () => {
        if (!phone || phone.length < 9) {
            toast.error("Please enter a valid WhatsApp number");
            return;
        }

        tap("success");
        try {
            setIsJoining(true);

            if (isRegisteredElsewhere) {
                await survivalApi.leaveExamCenter(
                    userGlobalStatus.exam_center_id
                );
            }

            await survivalApi.joinExamCenter({
                centerId,
                examCycle: currentCycle,
                roommate: prefRoommate,
                study: prefStudy,
                whatsapp_number: cleanPhone(phone),
            });

            toast.success(
                isRegisteredElsewhere
                    ? `Switched to ${centerName}`
                    : "You're on the list"
            );
            setShowJoinModal(false);
            fetchData();
        } catch (error) {
            console.error("Join error:", error);
            toast.error("Failed to join. Please try again.");
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        if (
            !window.confirm(
                `Remove your details from ${centerName}?`
            )
        )
            return;

        tap("warning");
        try {
            setIsJoining(true);
            await survivalApi.leaveExamCenter(centerId);
            toast.success("Removed from the list");
            fetchData();
            setPrefRoommate(false);
            setPrefStudy(false);
        } catch (error) {
            console.error("Error leaving center:", error);
            toast.error("Action failed. Please try again.");
        } finally {
            setIsJoining(false);
        }
    };

    const handleBack = () => {
        tap();
        navigate(-1);
    };

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        Exam buddies
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {centerName || "Exam center"}
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Status card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3 text-center">
                        <div className="h-14 w-14 rounded-2xl
                                        bg-blue-50 dark:bg-blue-400/10
                                        flex items-center justify-center mx-auto">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-blue-600 dark:text-blue-400 leading-none mb-1">
                                {currentCycle}
                            </p>
                            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white
                                           leading-snug">
                                Sitting exams here?
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400
                                          leading-snug mt-1 max-w-[280px] mx-auto">
                                Join the list so others can connect for study or
                                logistics.
                            </p>
                        </div>

                        {!userGlobalStatus ? (
                            <button
                                onClick={() => {
                                    tap();
                                    setShowJoinModal(true);
                                }}
                                className="w-full h-11 rounded-xl
                                           bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-2
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <UserPlus className="h-4 w-4" />
                                Count me in
                            </button>
                        ) : isRegisteredHere ? (
                            <button
                                onClick={handleLeave}
                                disabled={isJoining}
                                className="w-full h-10 rounded-xl
                                           bg-rose-50 dark:bg-rose-400/10
                                           text-rose-700 dark:text-rose-400
                                           text-[12px] font-bold
                                           flex items-center justify-center gap-2
                                           active:scale-[0.97] transition-transform
                                           disabled:opacity-60"
                                style={{ touchAction: "manipulation" }}
                            >
                                <UserMinus className="h-3.5 w-3.5" />
                                Remove my details
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    tap();
                                    setShowJoinModal(true);
                                }}
                                className="w-full h-11 rounded-xl
                                           bg-amber-500 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-2
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <ArrowLeftRight className="h-4 w-4" />
                                <div className="flex flex-col items-start leading-tight">
                                    <span>Switch to this station</span>
                                    <span className="text-[10px] opacity-80 font-medium">
                                        Currently at{" "}
                                        {userGlobalStatus.exam_center?.name}
                                    </span>
                                </div>
                            </button>
                        )}
                    </section>

                    {/* WhatsApp community card */}
                    <section className="rounded-2xl bg-emerald-600 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl
                                            bg-white/[0.18]
                                            flex items-center justify-center shrink-0">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5 fill-white"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-white/80 leading-none mb-1">
                                    Live community
                                </p>
                                <h3 className="text-sm font-bold text-white leading-tight truncate">
                                    Medrae exam candidate hub
                                </h3>
                            </div>
                        </div>

                        <p className="text-[11px] text-white/85 leading-snug">
                            Discuss clinical papers, exam tips, and logistics with
                            everyone.
                        </p>

                        <a
                            href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => tap()}
                            className="w-full h-10 rounded-xl
                                       bg-white text-emerald-700
                                       text-[12px] font-bold uppercase tracking-wider
                                       flex items-center justify-center
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Join WhatsApp group
                        </a>
                    </section>

                    {/* Candidates list */}
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 leading-none mb-1">
                                Candidates
                            </p>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {buddies.length} student
                                {buddies.length === 1 ? "" : "s"} here
                            </h3>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold tabular-nums
                                         bg-blue-50 dark:bg-blue-400/10
                                         text-blue-700 dark:text-blue-400
                                         px-2 py-0.5 rounded-full">
                            {buddies.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                               flex items-center gap-3 animate-pulse"
                                >
                                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                                </div>
                            ))}
                        </div>
                    ) : buddies.length > 0 ? (
                        <div className="space-y-2">
                            {buddies.map((buddy) => (
                                <article
                                    key={buddy.id}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                               flex items-center gap-3"
                                >
                                    <div className="relative shrink-0">
                                        <img
                                            src={
                                                buddy.student?.avatar_url ||
                                                `https://ui-avatars.com/api/?name=${buddy.student?.name}&background=random`
                                            }
                                            className="h-12 w-12 rounded-xl object-cover"
                                            alt=""
                                        />
                                        <div className="absolute -bottom-0.5 -right-0.5
                                                        h-3 w-3 rounded-full
                                                        bg-emerald-500
                                                        ring-2 ring-white dark:ring-[#161b22]" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[13px] font-bold
                                                       text-slate-900 dark:text-white truncate leading-tight">
                                            {buddy.student?.name}
                                        </h4>
                                        <div className="flex items-center gap-1 mt-0.5
                                                        text-[10px] font-bold uppercase tracking-wider
                                                        text-slate-500 dark:text-slate-400">
                                            <GraduationCap className="h-3 w-3 shrink-0" />
                                            <p className="truncate">
                                                {buddy.student?.institution ||
                                                    "Medical student"}
                                            </p>
                                        </div>

                                        <div className="flex gap-1 mt-1.5 flex-wrap">
                                            {buddy.is_looking_for_roommate && (
                                                <span className="inline-flex items-center gap-1
                                                                 bg-slate-100 dark:bg-white/[0.06]
                                                                 text-slate-600 dark:text-slate-300
                                                                 text-[9px] font-bold uppercase tracking-wider
                                                                 px-1.5 py-0.5 rounded-md">
                                                    <BedDouble className="h-2.5 w-2.5" />
                                                    Room
                                                </span>
                                            )}
                                            {buddy.is_looking_for_study_partner && (
                                                <span className="inline-flex items-center gap-1
                                                                 bg-blue-50 dark:bg-blue-400/10
                                                                 text-blue-700 dark:text-blue-400
                                                                 text-[9px] font-bold uppercase tracking-wider
                                                                 px-1.5 py-0.5 rounded-md">
                                                    <BookOpen className="h-2.5 w-2.5" />
                                                    Study
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <a
                                        href={`https://wa.me/${buddy.whatsapp_number ||
                                            cleanPhone(buddy.student?.phone || "")
                                            }?text=${encodeURIComponent(
                                                `Hi ${buddy.student?.name}, I'm also sitting exams at ${centerName}. Found you on Medrae Hub!`
                                            )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => tap()}
                                        className="h-10 w-10 rounded-xl shrink-0
                                                   bg-emerald-50 dark:bg-emerald-400/10
                                                   text-emerald-700 dark:text-emerald-400
                                                   flex items-center justify-center
                                                   active:scale-[0.92] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                        aria-label={`Message ${buddy.student?.name}`}
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </a>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto">
                                <Users className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    No one here yet
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto leading-snug">
                                    Be the first — join the list so others can
                                    find you.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Join modal ──────────────────────────────────── */}
            <CenteredModal
                open={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                title={isRegisteredElsewhere ? "Switch stations?" : "Almost there"}
                subtitle={
                    isRegisteredElsewhere
                        ? `This will move you from "${userGlobalStatus?.exam_center?.name}" to "${centerName}".`
                        : "Make sure your WhatsApp number is correct."
                }
                maxWidthClass="max-w-md"
                maxHeight="90dvh"
                footer={
                    <div className="px-4 py-3">
                        <button
                            onClick={handleJoinSubmit}
                            disabled={isJoining}
                            className={`w-full h-11 rounded-xl
                                        text-sm font-bold text-white
                                        flex items-center justify-center gap-2
                                        transition-transform
                                        ${isRegisteredElsewhere
                                    ? "bg-amber-500 active:scale-[0.97]"
                                    : "bg-blue-600 active:scale-[0.97]"
                                }
                                        disabled:opacity-60 disabled:cursor-wait`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {isJoining ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            {isJoining
                                ? "Saving…"
                                : isRegisteredElsewhere
                                    ? "Confirm switch"
                                    : "Confirm & join"}
                        </button>
                    </div>
                }
            >
                <div className="px-4 py-4 space-y-3">
                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400">
                            WhatsApp number
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2
                                              h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="tel"
                                placeholder="0712 345 678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           pl-10 pr-3.5 text-sm tabular-nums font-bold
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => {
                                tap();
                                setPrefRoommate(!prefRoommate);
                            }}
                            className={`h-14 rounded-xl
                                        flex flex-col items-center justify-center gap-1
                                        text-[10px] font-bold uppercase tracking-wider
                                        active:scale-[0.97] transition-all
                                        ${prefRoommate
                                    ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <BedDouble className="h-4 w-4" />
                            Need room
                        </button>
                        <button
                            onClick={() => {
                                tap();
                                setPrefStudy(!prefStudy);
                            }}
                            className={`h-14 rounded-xl
                                        flex flex-col items-center justify-center gap-1
                                        text-[10px] font-bold uppercase tracking-wider
                                        active:scale-[0.97] transition-all
                                        ${prefStudy
                                    ? "bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <BookOpen className="h-4 w-4" />
                            Study partner
                        </button>
                    </div>
                </div>
            </CenteredModal>
        </div>
    );
};

export default ExamBuddiesPage;