"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Megaphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
export default function TutorsList() {
    const user = useUser();

    const notificationSound = useRef<HTMLAudioElement | null>(null);
    const announcementsRef = useRef<HTMLDivElement | null>(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [tutors, setTutors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTutor, setSelectedTutor] = useState<any>(null);
    const [block, setBlock] = useState("");
    const [year, setYear] = useState<number | "">("");
    const [semester, setSemester] = useState<number | "">("");
    const [joining, setJoining] = useState(false);
    const [cohortMessages, setCohortMessages] = useState<any[]>([]);
    const [existingCohorts, setExistingCohorts] = useState<any[]>([]);
    const [leaveTarget, setLeaveTarget] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readMessages, setReadMessages] = useState<string[]>([]);
    /* ---------------- INIT SOUND ---------------- */

    useEffect(() => {
        notificationSound.current = new Audio("/sounds/notification.mp3");
    }, []);

    const playSound = () => {
        notificationSound.current?.play().catch(() => { });
    };

    const vibrateStrong = () => {
        if ("vibrate" in navigator) {
            navigator.vibrate([400, 150, 400, 150, 400]); // stronger pattern
        }
    };

    const sendPushNotification = (msg: any) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Cohort Announcement", {
                body: `Block ${msg.block} | Year ${msg.year} | Semester ${msg.semester}`,
            });
        }
    };

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    /* ---------------- AUTO READ WHEN VISIBLE ---------------- */

    useEffect(() => {
        if (!announcementsRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setUnreadCount(0);
                }
            },
            { threshold: 0.6 }
        );

        observer.observe(announcementsRef.current);

        return () => observer.disconnect();
    }, [cohortMessages]);

    /* ---------------- INITIAL LOAD ---------------- */

    useEffect(() => {
        if (user?.id) {
            fetchTutors();
            fetchStudentCohorts();
            const cleanup = setupRealtime();
            return () => cleanup?.();
        }
    }, [user]);

    /* ---------------- MARK MESSAGE AS READ ---------------- */

    const markMessageRead = async (messageId: string) => {
        if (!messageId || !user?.id) return;

        const { data, error } = await supabase
            .from("cohort_message_reads")
            .insert({
                message_id: messageId,
                student_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error("Error marking message read:", error.message);
        } else {
            console.log("Marked as read:", data);
        }
    };

    const handleMarkRead = async (msgId: string) => {
        await markMessageRead(msgId);

        setReadMessages(prev => [...prev, msgId]);

        setUnreadCount(prev => Math.max(prev - 1, 0));
    };
    /* ---------------- MARK ALL READ ---------------- */
    const markAllRead = async () => {
        await Promise.all(cohortMessages.map(msg => markMessageRead(msg.id)));
        setUnreadCount(0);
    };
    /* ---------------- REALTIME ---------------- */

    const setupRealtime = () => {
        const messageChannel = supabase
            .channel("cohort-messages")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "cohort_messages" },
                (payload) => {
                    const msg = payload.new;

                    const match = existingCohorts.some(
                        (c) =>
                            c.tutor_id === msg.tutor_id &&
                            c.block === msg.block &&
                            c.year === msg.year &&
                            c.semester === msg.semester
                    );

                    if (!match) return;

                    setCohortMessages((prev) => [msg, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    // 🔥 Enhanced notification effects
                    playSound();
                    vibrateStrong();
                    sendPushNotification(msg);

                    toast.success(
                        `New announcement for Block ${msg.block}, Year ${msg.year}, Semester ${msg.semester}`,
                        {
                            className:
                                "animate-in slide-in-from-right duration-300",
                        }
                    );
                }
            )
            .subscribe();

        const cohortChannel = supabase
            .channel("cohort-sync")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tutor_students" },
                () => {
                    fetchStudentCohorts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(cohortChannel);
        };
    };

    /* ---------------- FETCH TUTORS ---------------- */

    const fetchTutors = async () => {
        setLoading(true);

        const { data: profile } = await supabase
            .from("profiles")
            .select("institution")
            .eq("user_id", user?.id)
            .single();

        if (!profile?.institution) {
            setTutors([]);
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from("profiles")
            .select("user_id, name, username, specialization, avatar_url")
            .eq("role", "tutor")
            .eq("institution", profile.institution);

        setTutors(data || []);
        setLoading(false);
    };

    /* ---------------- FETCH COHORTS ---------------- */

    const fetchStudentCohorts = async () => {
        const { data } = await supabase
            .from("tutor_students")
            .select(`
                tutor_id,
                block,
                year,
                semester,
                profiles!tutor_students_tutor_id_fkey(name)
            `)
            .eq("student_id", user?.id);

        setExistingCohorts(data || []);
        fetchAnnouncements(data || []);
    };

    /* ---------------- FETCH ANNOUNCEMENTS ---------------- */

    const fetchAnnouncements = async (cohorts: any[]) => {
        if (!cohorts.length) {
            setCohortMessages([]);
            return;
        }

        const { data } = await supabase
            .from("cohort_messages")
            .select("*")
            .order("created_at", { ascending: false });

        const filtered = (data || []).filter((msg) =>
            cohorts.some(
                (c) =>
                    c.tutor_id === msg.tutor_id &&
                    c.block === msg.block &&
                    c.year === msg.year &&
                    c.semester === msg.semester
            )
        );

        setCohortMessages(filtered);

        /* FETCH READ MESSAGES */

        const { data: reads } = await supabase
            .from("cohort_message_reads")
            .select("message_id")
            .eq("student_id", user?.id);

        const readIds = reads?.map((r) => r.message_id) || [];

        setReadMessages(readIds);

        /* CALCULATE UNREAD COUNT */

        const unread = filtered.filter((msg) => !readIds.includes(msg.id)).length;
        setUnreadCount(unread);

        setCohortMessages(filtered);
    };

    /* ---------------- JOIN ---------------- */

    const handleJoinTutor = async () => {
        if (!selectedTutor || !block || !year || !semester) return;

        const exists = existingCohorts.some(
            (c) =>
                c.tutor_id === selectedTutor.user_id &&
                c.block === block &&
                c.year === year &&
                c.semester === semester
        );

        if (exists) {
            toast.error("You are already in this tutor's cohort!");
            return;
        }

        setJoining(true);

        const { error } = await supabase.from("tutor_students").insert({
            tutor_id: selectedTutor.user_id,
            student_id: user?.id,
            block,
            year,
            semester,
        });

        if (error) {
            toast.error("Error linking tutor: " + error.message);
        } else {
            toast.success(`Successfully joined ${selectedTutor.name}`);
            fetchStudentCohorts();
        }

        setJoining(false);
        setSelectedTutor(null);
        setBlock("");
        setYear("");
        setSemester("");
    };

    /* ---------------- LEAVE ---------------- */

    const confirmLeave = async () => {
        if (!leaveTarget) return;

        const { error } = await supabase
            .from("tutor_students")
            .delete()
            .eq("student_id", user?.id)
            .eq("tutor_id", leaveTarget.tutor_id)
            .eq("block", leaveTarget.block)
            .eq("year", leaveTarget.year)
            .eq("semester", leaveTarget.semester);

        if (error) {
            toast.error("Error leaving cohort");
        } else {
            toast.success("Successfully left the cohort");
            fetchStudentCohorts();
        }

        setLeaveTarget(null);
    };

    return (
        <div className="space-y-3 mt-3 animate-fade-in">

            <Card className="hover:shadow-xl transition-all duration-300 dark:bg-gray-900 border-0">

                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-green-400" />
                        <CardTitle>My Tutors</CardTitle>

                        {unreadCount > 0 && (
                            <div className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                                {unreadCount} New
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent>

                    {/* JOINED COHORTS */}

                    {existingCohorts.length > 0 && (
                        <div className="mb-4 space-y-2">
                            <h3 className="text-sm font-semibold">
                                Your Joined Cohorts
                            </h3>

                            {existingCohorts.map((c, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded transition-all duration-300 hover:scale-[1.02]"
                                >
                                    <div className="text-xs">
                                        <div className="font-medium">
                                            {c.profiles?.name || "Tutor"}
                                        </div>
                                        Block {c.block} | Year {c.year} | Semester {c.semester}
                                    </div>

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setLeaveTarget(c)}
                                    >
                                        Leave
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MAIN CONTENT unchanged below */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center space-x-3 p-3 border rounded-md"
                                >
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <Skeleton className="w-5 h-5 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : tutors.length === 0 ? (
                        <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                            <div>No tutors found in your institution.</div>
                            <Button
                                onClick={() => setInviteModalOpen(true)}
                                className="bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-400 transition-colors duration-200"
                            >
                                Invite a Tutor
                            </Button>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {tutors.map((tutor) => (
                                <li
                                    key={tutor.user_id}
                                    className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-[1.02]"
                                    onClick={() => setSelectedTutor(tutor)}
                                >
                                    <Avatar className="w-10 h-10">
                                        {tutor.avatar_url ? (
                                            <AvatarImage src={tutor.avatar_url} />
                                        ) : (
                                            <AvatarFallback>
                                                {tutor.name[0]}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>

                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {tutor.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            @{tutor.username || "N/A"} |{" "}
                                            {tutor.specialization || "N/A"}
                                        </div>
                                    </div>

                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* JOIN DROPDOWN (RESTORED) */}
                    {selectedTutor && (
                        <div className="mt-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800 space-y-3 animate-fade-in">
                            <div className="text-sm font-medium">
                                Join {selectedTutor.name}'s Cohort
                            </div>

                            <input
                                type="text"
                                placeholder="Block"
                                value={block}
                                onChange={(e) => setBlock(e.target.value)}
                                className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-900"
                            />

                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-900"
                            >
                                <option value="">Select Year</option>
                                <option value={1}>Year 1</option>
                                <option value={2}>Year 2</option>
                                <option value={3}>Year 3</option>
                                <option value={4}>Year 4</option>
                            </select>

                            <select
                                value={semester}
                                onChange={(e) => setSemester(Number(e.target.value))}
                                className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-900"
                            >
                                <option value="">Select Semester</option>
                                <option value={1}>Semester 1</option>
                                <option value={2}>Semester 2</option>
                            </select>

                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setSelectedTutor(null)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    onClick={handleJoinTutor}
                                    disabled={joining}
                                >
                                    {joining ? "Joining..." : "Join Cohort"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>


                {/* ANNOUNCEMENTS */}

                {cohortMessages.length > 0 && (
                    <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <Megaphone className="w-5 h-5 text-blue-400" />
                                <CardTitle>Your Cohort Announcements</CardTitle>

                                {unreadCount > 0 && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={markAllRead}
                                        className="ml-2"
                                    >
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-2">
                            {cohortMessages.map((msg) => {
                                const isUnread = !readMessages.includes(msg.id);

                                return (
                                    <div
                                        key={msg.id}
                                        className={`p-3 rounded-md animate-fade-in cursor-pointer transition
            ${isUnread
                                                ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                                                : "bg-gray-100 dark:bg-gray-800"
                                            }`}
                                        onClick={() => handleMarkRead(msg.id)}
                                    >

                                        {/* UNREAD BADGE */}
                                        {isUnread && (
                                            <div className="text-[10px] text-white bg-red-500 px-2 py-0.5 rounded-full inline-block mb-1">
                                                New
                                            </div>
                                        )}

                                        <div className="text-sm font-medium">
                                            {msg.message}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1">
                                            Cohort: {msg.block} | Year: {msg.year} | Semester: {msg.semester}
                                        </div>

                                        <div className="text-xs text-gray-400 mt-1">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </div>

                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </Card>
            {/* LEAVE MODAL */}

            <Dialog open={!!leaveTarget} onOpenChange={() => setLeaveTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Are you sure you want to leave this cohort?
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="secondary" onClick={() => setLeaveTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmLeave}>
                            Leave
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* YOUR ENTIRE ORIGINAL UI REMAINS EXACTLY AS YOU PROVIDED */}
            {/* (No deletions, nothing removed) */}
            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Invite a Tutor</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 text-sm">
                        <p>Hello! </p>
                        <p>
                            Invite a tutor by sending the template below. This message explains how they can help students, guide them, and join cohorts on our platform.
                        </p>
                        <p>Steps to invite a tutor:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Click the "Invite via WhatsApp" button below.</li>
                            <li>The pre-written template message will open in WhatsApp.</li>
                            <li>Send it to the tutor you want to invite.</li>
                        </ul>
                        <p>
                            The app link is included so they can sign up immediately: <a href="https://medrae.vercel.app/" className="text-blue-500 underline">https://medrae.vercel.app/</a>
                        </p>
                    </div>

                    <div className="flex justify-end mt-4 space-x-2">
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                                `Hello !

This platform helps students connect with knowledgeable tutors. By joining, you can guide students, answer questions, and post helpful announcements for your cohorts.

Steps to get started:
1. Sign up as a tutor on this platform.
2. Link your institution and specialization.
3. Create or join a cohort to start helping students.

Once added, students from your institution will be able to see you and join your cohorts.

Join the app here: https://medrae.vercel.app/`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                        >
                            <Button variant="outline">
                                Invite via WhatsApp
                            </Button>
                        </a>

                        <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}