// components/CohortAnnouncement.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Megaphone,
    Loader2,
    Pencil,
    Trash2,
    Check,
    Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";
import { cohortColor } from "@/lib/tutor/colors";
import { cacheInvalidate } from "@/lib/tutor/cache";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface LinkedStudent {
    block: string;
    year: number;
    semester: number;
}

interface CohortAnnouncementProps {
    linkedStudents: LinkedStudent[];
    /** Called when tutor taps "+ New" in the section header */
    onCompose: () => void;
}

interface MessageRow {
    id: string;
    block: string;
    year: number;
    semester: number;
    message: string;
    created_at: string;
    updated_at: string | null;
}

interface ReadRow {
    message_id: string;
    student_id: string;
    read_at: string;
    profiles: { name: string | null } | { name: string | null }[] | null;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------
// Section header (shared by loading / empty / list states)
// ---------------------------------------------------------------
function SectionHeader({
    count,
    onCompose,
}: {
    count: number;
    onCompose: () => void;
}) {
    return (
        <div className="px-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <Megaphone
                    className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
                    strokeWidth={2.5}
                />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Announcements
                </h2>
                {count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                        {count}
                    </span>
                )}
            </div>
            <button
                onClick={() => {
                    tap();
                    onCompose();
                }}
                className="h-7 px-2.5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center gap-1 active:scale-[0.97]"
                style={{ touchAction: "manipulation" }}
            >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                New
            </button>
        </div>
    );
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
export default function CohortAnnouncement({
    linkedStudents,
    onCompose,
}: CohortAnnouncementProps) {
    const user = useUser();

    const [messages, setMessages] = useState<MessageRow[]>([]);
    const [reads, setReads] = useState<Record<string, ReadRow[]>>({});
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Read list only matters if there are linked students — keeps section stable
    void linkedStudents;

    const colorFor = useMemo(
        () => (block: string, year: number, semester: number) =>
            cohortColor(block, year, semester),
        []
    );

    const fetchReads = useCallback(async (ids: string[]) => {
        if (ids.length === 0) {
            setReads({});
            return;
        }
        const { data } = await supabase
            .from("cohort_message_reads")
            .select("message_id, student_id, read_at, profiles(name)")
            .in("message_id", ids);

        const grouped: Record<string, ReadRow[]> = {};
        (data ?? []).forEach((r: ReadRow) => {
            if (!grouped[r.message_id]) grouped[r.message_id] = [];
            grouped[r.message_id].push(r);
        });
        setReads(grouped);
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("cohort_messages")
                .select("id, block, year, semester, message, created_at, updated_at")
                .eq("tutor_id", user.id)
                .order("created_at", { ascending: false })
                .limit(30);
            if (error) throw error;
            const rows = (data ?? []) as MessageRow[];
            setMessages(rows);
            await fetchReads(rows.map((m) => m.id));
        } catch (e: any) {
            toast.error(e?.message || "Failed to load announcements");
        } finally {
            setLoading(false);
        }
    }, [user?.id, fetchReads]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // -----------------------------------------------------------------
    // Edit
    // -----------------------------------------------------------------
    const startEdit = (m: MessageRow) => {
        tap();
        setEditingId(m.id);
        setEditDraft(m.message);
    };

    const cancelEdit = () => {
        tap();
        setEditingId(null);
        setEditDraft("");
    };

    const saveEdit = async (id: string) => {
        if (!editDraft.trim()) {
            tapError();
            toast.error("Message cannot be empty");
            return;
        }
        setBusyId(id);
        try {
            const { error } = await supabase
                .from("cohort_messages")
                .update({
                    message: editDraft.trim(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id);
            if (error) throw error;
            tapSuccess();
            toast.success("Updated");
            setEditingId(null);
            setEditDraft("");
            await fetchMessages();
        } catch (e: any) {
            tapError();
            toast.error(e?.message || "Failed to update");
        } finally {
            setBusyId(null);
        }
    };

    // -----------------------------------------------------------------
    // Delete (inline confirm, optimistic)
    // -----------------------------------------------------------------
    const deleteMessage = async (id: string) => {
        setBusyId(id);
        const prev = messages;
        setMessages((p) => p.filter((m) => m.id !== id));
        try {
            const { error } = await supabase
                .from("cohort_messages")
                .delete()
                .eq("id", id);
            if (error) throw error;
            cacheInvalidate("class:");
            tapSuccess();
            toast.success("Deleted");
            setConfirmingId(null);
        } catch (e: any) {
            tapError();
            setMessages(prev);
            toast.error(e?.message || "Failed to delete");
        } finally {
            setBusyId(null);
        }
    };

    // -----------------------------------------------------------------
    // Loading
    // -----------------------------------------------------------------
    if (loading && messages.length === 0) {
        return (
            <section className="space-y-2">
                <SectionHeader count={0} onCompose={onCompose} />
                <div className="space-y-2">
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="h-16 rounded-2xl p-3 bg-white dark:bg-[#161b22] animate-pulse"
                        >
                            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06]" />
                            <div className="h-2.5 w-48 rounded bg-slate-200 dark:bg-white/[0.06] mt-2" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // -----------------------------------------------------------------
    // Empty — still shows "+ New" so tutors can compose the first one
    // -----------------------------------------------------------------
    if (messages.length === 0) {
        return (
            <section className="space-y-2">
                <SectionHeader count={0} onCompose={onCompose} />
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                    <Megaphone
                        className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2"
                        strokeWidth={1.5}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        No announcements yet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Send your first message to a cohort
                    </p>
                    <button
                        onClick={() => {
                            tap();
                            onCompose();
                        }}
                        className="mt-3 h-9 px-4 rounded-xl bg-violet-600 text-white text-xs font-bold active:scale-[0.97]"
                        style={{ touchAction: "manipulation" }}
                    >
                        New announcement
                    </button>
                </div>
            </section>
        );
    }

    // -----------------------------------------------------------------
    // List
    // -----------------------------------------------------------------
    return (
        <section className="space-y-2">
            <SectionHeader count={messages.length} onCompose={onCompose} />

            <div className="space-y-2">
                {messages.map((m) => {
                    const color = colorFor(m.block, m.year, m.semester);
                    const readList = reads[m.id] ?? [];
                    const seenNames = readList
                        .map((r) => {
                            const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                            return p?.name ?? "Unknown";
                        })
                        .filter(Boolean);

                    const isEditing = editingId === m.id;
                    const isConfirming = confirmingId === m.id;
                    const isBusy = busyId === m.id;
                    const canEdit =
                        Date.now() - new Date(m.created_at).getTime() < ONE_DAY_MS;
                    const edited = m.updated_at && m.updated_at !== m.created_at;

                    return (
                        <div
                            key={m.id}
                            className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                        >
                            <div className="p-3 space-y-2">
                                {/* Top row: cohort chip + time */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`h-2 w-2 rounded-full shrink-0 ${color.dot}`}
                                    />
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                        Block {m.block} · Y{m.year} S{m.semester}
                                    </span>
                                    {edited && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                                            Edited
                                        </span>
                                    )}
                                    <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                                        {relativeTime(m.created_at)}
                                    </span>
                                </div>

                                {/* Message */}
                                {isEditing ? (
                                    <textarea
                                        value={editDraft}
                                        onChange={(e) => setEditDraft(e.target.value)}
                                        className="w-full h-20 p-3 rounded-xl bg-slate-50 dark:bg-[#0d1117] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                        style={{ touchAction: "manipulation" }}
                                    />
                                ) : (
                                    <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {m.message}
                                    </p>
                                )}

                                {/* Read status */}
                                {readList.length > 0 && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {readList.length}
                                        </span>{" "}
                                        {readList.length === 1 ? "read" : "reads"} ·{" "}
                                        {seenNames.slice(0, 3).join(", ")}
                                        {seenNames.length > 3 &&
                                            ` +${seenNames.length - 3} more`}
                                    </p>
                                )}
                            </div>

                            {/* Action bar */}
                            {isEditing ? (
                                <div className="border-t border-slate-100 dark:border-white/[0.04] p-3 flex gap-2">
                                    <button
                                        onClick={cancelEdit}
                                        disabled={isBusy}
                                        className="flex-1 h-9 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/5 disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => saveEdit(m.id)}
                                        disabled={isBusy || !editDraft.trim()}
                                        className="flex-1 h-9 rounded-lg bg-violet-600 text-white text-xs font-bold active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {isBusy ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        )}
                                        Save
                                    </button>
                                </div>
                            ) : isConfirming ? (
                                <div className="border-t border-slate-100 dark:border-white/[0.04] p-3 flex items-center gap-2">
                                    <p className="flex-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        Delete this announcement?
                                    </p>
                                    <button
                                        onClick={() => {
                                            tap();
                                            setConfirmingId(null);
                                        }}
                                        disabled={isBusy}
                                        className="h-8 px-3 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/5 disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deleteMessage(m.id)}
                                        disabled={isBusy}
                                        className="h-8 px-3 rounded-lg text-[11px] font-bold bg-rose-600 text-white active:scale-[0.97] disabled:opacity-50 flex items-center gap-1"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {isBusy && (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        Delete
                                    </button>
                                </div>
                            ) : (
                                <div className="border-t border-slate-100 dark:border-white/[0.04] grid grid-cols-2">
                                    {canEdit ? (
                                        <button
                                            onClick={() => startEdit(m)}
                                            className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-white/[0.03]"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            Edit
                                        </button>
                                    ) : (
                                        <div />
                                    )}
                                    <button
                                        onClick={() => {
                                            tap();
                                            setConfirmingId(m.id);
                                        }}
                                        className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 active:bg-rose-500/5"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}