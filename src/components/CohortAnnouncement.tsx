"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// SVG for megaphone
const MegaphoneSVG = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 inline-block mr-1"
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

export default function CohortAnnouncement({ linkedStudents }: CohortAnnouncementProps) {
    const user = useUser();

    const [selectedCohort, setSelectedCohort] = useState<{ block: string; year: number; semester: number } | null>(null);
    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    // Compute unique cohorts
    const cohortOptions = useMemo(() => {
        return Array.from(new Set(linkedStudents.map(s => `${s.block}|${s.year}|${s.semester}`))).map(item => {
            const [block, year, semester] = item.split("|");
            return { block, year: Number(year), semester: Number(semester) };
        });
    }, [linkedStudents]);

    const handleSendAnnouncement = async () => {
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
            toast.error(error.message || "Failed to send announcement");
        } else {
            toast.success("Announcement sent!");
            setAnnouncementMessage("");
            setSelectedCohort(null);
        }

        setSendingAnnouncement(false);
    };

    return (
        <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
            <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-gray-100">
                    <MegaphoneSVG /> Send Cohort Announcement
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-3">
                <select
                    value={selectedCohort ? `${selectedCohort.block}|${selectedCohort.year}|${selectedCohort.semester}` : ""}
                    onChange={(e) => {
                        const [block, year, semester] = e.target.value.split("|");
                        setSelectedCohort({ block, year: Number(year), semester: Number(semester) });
                    }}
                    className="border rounded p-2 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                    <option value="">Select Cohort</option>
                    {cohortOptions.map((c) => (
                        <option key={`${c.block}|${c.year}|${c.semester}`} value={`${c.block}|${c.year}|${c.semester}`}>
                            Block {c.block} - Year {c.year} - Sem {c.semester}
                        </option>
                    ))}
                </select>

                <textarea
                    placeholder="Write your message here..."
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    className="border rounded p-2 resize-none h-24 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />

                <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement}>
                    {sendingAnnouncement ? "Sending..." : "Send Announcement"}
                </Button>
            </CardContent>
        </Card>
    );
}