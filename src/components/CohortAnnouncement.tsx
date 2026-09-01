"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MegaphoneSVG = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 md:h-5 md:w-5 inline-block mr-1"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path d="M2 5a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />
        <path d="M5 5l10-3v16L5 15V5z" />
    </svg>
);

interface LinkedStudent {
    block: string;
    year: number;
    semester: number;
}

interface CohortAnnouncementProps {
    linkedStudents: LinkedStudent[];
}

export default function CohortAnnouncement({
    linkedStudents,
}: CohortAnnouncementProps) {
    const user = useUser();

    const [selectedCohort, setSelectedCohort] = useState<{
        block: string;
        year: number;
        semester: number;
    } | null>(null);

    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sentAnnouncements, setSentAnnouncements] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [readData, setReadData] = useState<any>({});

    // Compute unique cohorts - memoized
    const cohortOptions = useMemo(() => {
        return Array.from(
            new Set(linkedStudents.map((s) => `${s.block}|${s.year}|${s.semester}`))
        ).map((item) => {
            const [block, year, semester] = item.split("|");
            return { block, year: Number(year), semester: Number(semester) };
        });
    }, [linkedStudents]);

    const fetchSentAnnouncements = useCallback(async () => {
        if (!user?.id) return;

        const { data } = await supabase
            .from("cohort_messages")
            .select("*")
            .eq("tutor_id", user.id)
            .order("created_at", { ascending: false });

        setSentAnnouncements(data || []);

        if (data) {
            fetchReadStats(data.map((m) => m.id));
        }
    }, [user?.id]);

    const fetchReadStats = useCallback(async (messageIds: string[]) => {
        const { data } = await supabase
            .from("cohort_message_reads")
            .select(
                `
        message_id,
        read_at,
        student_id,
        profiles (name)
      `
            )
            .in("message_id", messageIds);

        const grouped: any = {};

        data?.forEach((r) => {
            if (!grouped[r.message_id]) grouped[r.message_id] = [];
            grouped[r.message_id].push(r);
        });

        setReadData(grouped);
    }, []);

    useEffect(() => {
        fetchSentAnnouncements();
    }, [user, fetchSentAnnouncements]);

    const handleSendAnnouncement = useCallback(async () => {
        if (!selectedCohort || !announcementMessage) {
            toast.error("Select a cohort and write a message.");
            return;
        }

        setSendingAnnouncement(true);

        const { error } = await supabase.from("cohort_messages").insert({
            tutor_id: user?.id,
            block: selectedCohort.block,
            year: selectedCohort.year,
            semester: selectedCohort.semester,
            message: announcementMessage,
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Announcement sent!");
            setAnnouncementMessage("");
            setSelectedCohort(null);
            fetchSentAnnouncements();
        }

        setSendingAnnouncement(false);
    }, [selectedCohort, announcementMessage, user?.id, fetchSentAnnouncements]);

    const handleUpdate = useCallback(async (id: string) => {
        const { error } = await supabase
            .from("cohort_messages")
            .update({
                message: announcementMessage,
                updated_at: new Date(),
            })
            .eq("id", id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Updated successfully");
            setEditingId(null);
            setAnnouncementMessage("");
            fetchSentAnnouncements();
        }
    }, [announcementMessage, fetchSentAnnouncements]);

    const handleDelete = useCallback(async (id: string) => {
        const confirmDelete = window.confirm("Delete this announcement?");
        if (!confirmDelete) return;

        setDeletingId(id);

        const { error } = await supabase
            .from("cohort_messages")
            .delete()
            .eq("id", id);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Deleted");
            fetchSentAnnouncements();
        }

        setDeletingId(null);
    }, [fetchSentAnnouncements]);

    return (
        <Card className="md:hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0 rounded-none md:rounded-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center text-gray-900 dark:text-gray-100 text-sm md:text-base">
                    <MegaphoneSVG /> Send Cohort Announcement
                </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col space-y-2 md:space-y-3 p-4 md:p-6 pt-0 md:pt-0">
                {/* Cohort Select */}
                <select
                    value={
                        selectedCohort
                            ? `${selectedCohort.block}|${selectedCohort.year}|${selectedCohort.semester}`
                            : ""
                    }
                    onChange={(e) => {
                        const [block, year, semester] = e.target.value.split("|");
                        setSelectedCohort({
                            block,
                            year: Number(year),
                            semester: Number(semester),
                        });
                    }}
                    className="border rounded-lg md:rounded-xl p-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-xs md:text-sm"
                >
                    <option value="">Select Cohort</option>
                    {cohortOptions.map((c) => (
                        <option
                            key={`${c.block}|${c.year}|${c.semester}`}
                            value={`${c.block}|${c.year}|${c.semester}`}
                        >
                            Block {c.block} - Year {c.year} - Sem {c.semester}
                        </option>
                    ))}
                </select>

                {/* Message Textarea */}
                <textarea
                    placeholder="Write your message here..."
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    className="border rounded-lg md:rounded-xl p-2 resize-none h-20 md:h-24 bg-white dark:bg-gray-800 dark:text-gray-100 text-xs md:text-sm"
                />

                {/* Send Button */}
                <Button
                    onClick={handleSendAnnouncement}
                    disabled={sendingAnnouncement}
                    className="text-xs md:text-sm h-9 md:h-10"
                >
                    {sendingAnnouncement ? "Sending..." : "Send Announcement"}
                </Button>

                {/* Sent Announcements List */}
                <div className="space-y-2 md:space-y-3 pt-3 md:pt-4">
                    {sentAnnouncements.map((a) => {
                        const reads = readData[a.id] || [];
                        const isEdited = a.updated_at && a.updated_at !== a.created_at;
                        const ONE_DAY = 24 * 60 * 60 * 1000;

                        const canEdit =
                            Date.now() - new Date(a.created_at).getTime() < ONE_DAY;

                        return (
                            <div
                                key={a.id}
                                className="p-2.5 md:p-3 border rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800"
                            >
                                {/* Header Row */}
                                <div className="flex justify-between items-center mb-1.5 md:mb-2 flex-wrap gap-1.5">
                                    <div className="text-xs md:text-sm font-medium">
                                        Block {a.block} - Year {a.year} - Sem {a.semester}
                                    </div>

                                    <div className="flex gap-1.5 md:gap-2">
                                        <Badge className="text-[10px] md:text-xs">{reads.length} Viewed</Badge>
                                        {isEdited && <Badge variant="secondary" className="text-[10px] md:text-xs">Edited</Badge>}
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="text-xs md:text-sm mb-1.5 md:mb-2">{a.message}</div>

                                {/* Viewed By */}
                                {reads.length > 0 && (
                                    <div className="text-[10px] md:text-xs text-gray-500 mb-1.5 md:mb-2">
                                        Viewed by:{" "}
                                        {reads.map((r: any) => r.profiles?.name).join(", ")}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-1.5 md:gap-2 flex-wrap">
                                    {canEdit && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setEditingId(a.id);
                                                setAnnouncementMessage(a.message);
                                            }}
                                            className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
                                        >
                                            Edit
                                        </Button>
                                    )}

                                    {editingId === a.id && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleUpdate(a.id)}
                                            className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
                                        >
                                            Save
                                        </Button>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={deletingId === a.id}
                                        onClick={() => handleDelete(a.id)}
                                        className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
                                    >
                                        {deletingId === a.id ? "Deleting..." : "Delete"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}