"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    ThumbsUp, Bookmark, Flag, Eye, CheckCircle2, Award,
    MessageCircle, MoreVertical, Trash2, Hash,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import MicroCaseComments from "./MicroCaseComments";
import { WardCase, getTemplateDef } from "./wardCaseTypes";

const SECTION_BG = {
    light: "bg-slate-50",
    dark: "dark:bg-[#161b22]",
};

interface Props {
    wardCase: WardCase;
    currentUser: any;
    onDeleted?: (id: string) => void;
}

export default function WardCaseCard({ wardCase, currentUser, onDeleted }: Props) {
    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [endorsed, setEndorsed] = useState(false);
    const [likes, setLikes] = useState(wardCase.likes_count);
    const [bookmarks, setBookmarks] = useState(wardCase.bookmarks_count);
    const [endorsements, setEndorsements] = useState(wardCase.endorsements_count);
    const [commentsCount, setCommentsCount] = useState(wardCase.comments_count);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const markedSeen = useRef(false);

    const isMine = currentUser?.id === wardCase.user_id;
    const def = getTemplateDef(wardCase.template);

    // ── Load my interaction state ──
    useEffect(() => {
        if (!currentUser?.id) return;
        (async () => {
            try {
                const { data } = await supabase.rpc("get_ward_case_state", {
                    p_case_id: wardCase.id,
                });
                const row = (data ?? [])[0];
                if (row) {
                    setLiked(!!row.has_liked);
                    setBookmarked(!!row.has_bookmarked);
                    setEndorsed(!!row.has_endorsed);
                }
            } catch { }
        })();
    }, [wardCase.id, currentUser?.id]);

    // ── Mark seen once it mounts (one-shot feed) ──
    useEffect(() => {
        if (!currentUser?.id || markedSeen.current) return;
        markedSeen.current = true;
        supabase
            .rpc("mark_ward_case_seen", { p_case_id: wardCase.id })
            .then(({ error }) => {
                if (error) console.warn("[WardCase] mark seen failed:", error.message);
            });
    }, [wardCase.id, currentUser?.id]);

    const toggleLike = useCallback(async () => {
        if (!currentUser?.id) return;
        const next = !liked;
        setLiked(next);
        setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
        if (navigator.vibrate) navigator.vibrate(10);
        try {
            if (next) {
                await supabase
                    .from("user_ward_case_likes")
                    .insert({ case_id: wardCase.id, user_id: currentUser.id });
            } else {
                await supabase
                    .from("user_ward_case_likes")
                    .delete()
                    .match({ case_id: wardCase.id, user_id: currentUser.id });
            }
        } catch {
            setLiked(!next);
            setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
        }
    }, [liked, wardCase.id, currentUser?.id]);

    const toggleBookmark = useCallback(async () => {
        if (!currentUser?.id) return;
        const next = !bookmarked;
        setBookmarked(next);
        setBookmarks((n) => Math.max(0, n + (next ? 1 : -1)));
        if (navigator.vibrate) navigator.vibrate(10);
        try {
            if (next) {
                await supabase
                    .from("user_ward_case_bookmarks")
                    .insert({ case_id: wardCase.id, user_id: currentUser.id });
            } else {
                await supabase
                    .from("user_ward_case_bookmarks")
                    .delete()
                    .match({ case_id: wardCase.id, user_id: currentUser.id });
            }
        } catch {
            setBookmarked(!next);
            setBookmarks((n) => Math.max(0, n + (next ? -1 : 1)));
        }
    }, [bookmarked, wardCase.id, currentUser?.id]);

    const toggleEndorse = useCallback(async () => {
        if (!currentUser?.id) return;
        const next = !endorsed;
        setEndorsed(next);
        setEndorsements((n) => Math.max(0, n + (next ? 1 : -1)));
        if (navigator.vibrate) navigator.vibrate(10);
        try {
            if (next) {
                await supabase
                    .from("user_ward_case_endorsements")
                    .insert({ case_id: wardCase.id, user_id: currentUser.id });
                playSound("tap-correct", false);
            } else {
                await supabase
                    .from("user_ward_case_endorsements")
                    .delete()
                    .match({ case_id: wardCase.id, user_id: currentUser.id });
            }
        } catch {
            setEndorsed(!next);
            setEndorsements((n) => Math.max(0, n + (next ? -1 : 1)));
        }
    }, [endorsed, wardCase.id, currentUser?.id]);

    const handleDelete = useCallback(async () => {
        if (!isMine) return;
        if (!confirm("Delete this case? Comments will be lost.")) return;
        try {
            await supabase.from("user_ward_cases").delete().eq("id", wardCase.id);
            onDeleted?.(wardCase.id);
        } catch (err) {
            console.warn("[WardCase] delete failed:", err);
        }
    }, [isMine, wardCase.id, onDeleted]);

    const renderContent = () => {
        const c = wardCase.content || {};
        const sections: { label: string; value: any }[] = [];

        if (wardCase.template === "ward") {
            sections.push(
                { label: "Patient scenario", value: c.scenario },
                { label: "Critical question", value: c.question },
                { label: "Correct response", value: c.answer },
                { label: "Clinical rationale", value: c.rationale }
            );
        } else if (wardCase.template === "exam") {
            sections.push(
                { label: "Question", value: c.question },
                {
                    label: "Options",
                    value: (
                        <div className="grid grid-cols-1 gap-1 mt-1">
                            {["A", "B", "C", "D"].map((k) => {
                                const opt = c[`option${k}`];
                                if (!opt) return null;
                                const correct = c.correctAnswer === k;
                                return (
                                    <div
                                        key={k}
                                        className={`flex gap-2 px-2 py-1.5 rounded-lg text-[12px] ${correct
                                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold"
                                            : "bg-gray-100 dark:bg-[#21262d] text-gray-800 dark:text-[#e6edf3]"
                                            }`}
                                    >
                                        <span className="font-bold">{k}.</span>
                                        <span className="flex-1">{opt}</span>
                                        {correct && <CheckCircle2 size={13} className="mt-0.5" />}
                                    </div>
                                );
                            })}
                        </div>
                    ),
                },
                { label: "Explanation", value: c.explanation }
            );
        } else if (wardCase.template === "reflection") {
            sections.push(
                { label: "Situation", value: c.situation },
                { label: "My role", value: c.role },
                { label: "What I did", value: c.action },
                { label: "Outcome & lesson", value: c.outcome }
            );
        } else if (wardCase.template === "drug") {
            sections.push(
                { label: "Prescription", value: c.prescription },
                { label: "Patient", value: c.patient },
                { label: "Question", value: c.question },
                { label: "Answer + steps", value: c.answer }
            );
        } else if (wardCase.template === "osce") {
            sections.push(
                { label: "Setting", value: c.setting },
                { label: "Complaint", value: c.complaint },
                { label: "Checklist", value: c.checklist },
                { label: "Correct steps", value: c.correctSteps }
            );
        }

        return (
            <div className="space-y-2">
                {sections
                    .filter((s) => s.value)
                    .map((s) => (
                        <div
                            key={s.label}
                            className={`p-2.5 rounded-xl ${SECTION_BG.light} ${SECTION_BG.dark}`}
                        >
                            <p className="text-[9.5px] uppercase tracking-widest font-bold text-gray-600 dark:text-[#8b949e] mb-1">
                                {s.label}
                            </p>
                            {typeof s.value === "string" ? (
                                <p className="text-[13px] leading-relaxed text-gray-900 dark:text-[#e6edf3] whitespace-pre-wrap">
                                    {s.value}
                                </p>
                            ) : (
                                s.value
                            )}
                        </div>
                    ))}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-[#0d1117] rounded-2xl overflow-hidden"
        >
            {/* ── Author header ─────────────────────────── */}
            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                <img
                    src={wardCase.author_avatar || "/UsersAvatar.jpg"}
                    alt={wardCase.author_name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 dark:text-[#e6edf3] truncate">
                        {wardCase.author_name}
                    </p>
                    <p className="text-[10.5px] text-gray-500 dark:text-[#8b949e] flex items-center gap-1">
                        <span className="text-[13px]">{def.emoji}</span>
                        <span className="font-medium">{def.label}</span>
                        <span>·</span>
                        <span>
                            {new Date(wardCase.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                            })}
                        </span>
                    </p>
                </div>
                {isMine && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu((v) => !v)}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#161b22] transition"
                            aria-label="Menu"
                        >
                            <MoreVertical size={16} className="text-gray-500 dark:text-[#8b949e]" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-9 z-20 bg-white dark:bg-[#161b22] rounded-lg overflow-hidden shadow-lg">
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        handleDelete();
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-red-600 hover:bg-gray-100 dark:hover:bg-[#21262d] whitespace-nowrap"
                                >
                                    <Trash2 size={13} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Title ─────────────────────────────────── */}
            <div className="px-3 pb-2">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-[#e6edf3] leading-snug">
                    {wardCase.title}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {wardCase.related_unit && (
                        <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-[#0d1c2e] dark:text-blue-300">
                            {wardCase.related_unit}
                        </span>
                    )}
                    {wardCase.difficulty && (
                        <span
                            className={`text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md ${wardCase.difficulty === "hard"
                                ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                : wardCase.difficulty === "medium"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                                }`}
                        >
                            {wardCase.difficulty}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Image (if any) ────────────────────────── */}
            {wardCase.content?.image_url && (
                <div className="px-3 pb-2">
                    <img
                        src={wardCase.content.image_url.replace(
                            "/upload/",
                            "/upload/w_800,f_auto,q_auto/"
                        )}
                        alt={wardCase.title}
                        className="w-full max-h-[420px] object-contain bg-black rounded-xl"
                        loading="lazy"
                    />
                </div>
            )}

            {/* ── Content sections ──────────────────────── */}
            <div className="px-3 pb-2">{renderContent()}</div>

            {/* ── Tags ──────────────────────────────────── */}
            {wardCase.tags && wardCase.tags.length > 0 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {wardCase.tags.slice(0, 5).map((tag) => (
                        <span
                            key={tag}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-gray-600 dark:text-[#8b949e] bg-gray-100 dark:bg-[#161b22] px-2 py-1 rounded-full uppercase tracking-tight"
                        >
                            <Hash size={9} />
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Actions ───────────────────────────────── */}
            <div className="px-3 py-2 flex items-center gap-1.5 flex-wrap border-t border-gray-100 dark:border-[#30363d]">
                <button
                    onClick={toggleEndorse}
                    className={`flex items-center justify-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-bold transition ${endorsed
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-[#161b22] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d]"
                        }`}
                >
                    <ThumbsUp size={12} fill={endorsed ? "currentColor" : "none"} />
                    {endorsements}
                </button>
                <button
                    onClick={toggleBookmark}
                    className={`flex items-center justify-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-bold transition ${bookmarked
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 dark:bg-[#161b22] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d]"
                        }`}
                >
                    <Bookmark size={12} fill={bookmarked ? "currentColor" : "none"} />
                    {bookmarks}
                </button>
                <button
                    onClick={toggleLike}
                    className={`flex items-center justify-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-bold transition ${liked
                        ? "bg-rose-500 text-white"
                        : "bg-gray-100 dark:bg-[#161b22] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d]"
                        }`}
                >
                    <Award size={12} fill={liked ? "currentColor" : "none"} />
                    {likes}
                </button>
                <div className="flex items-center gap-1 ml-auto text-[11px] font-bold text-gray-600 dark:text-[#8b949e]">
                    <Eye size={12} />
                    {wardCase.views_count}
                </div>
            </div>

            {/* ── Comments ─────────────────────────────── */}
            <div className="px-2 pb-2">
                <MicroCaseComments
                    cardId={wardCase.id}
                    user={currentUser}
                    commentsCount={commentsCount}
                    onCountChange={setCommentsCount}
                    open={commentsOpen}
                    onToggleOpen={() => setCommentsOpen((v) => !v)}
                />
            </div>
        </motion.div>
    );
}