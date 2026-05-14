"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Megaphone, CheckCircle, ArrowUpRight } from "lucide-react";
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
    // cache for session
    const cachedTutors = useRef<any[] | null>(null);
    const cachedCohorts = useRef<any[] | null>(null);
    const cachedAnnouncements = useRef<any[] | null>(null);
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
        if (cachedTutors.current) {
            setTutors(cachedTutors.current);
            setLoading(false);
            return; // use cached
        }

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
        cachedTutors.current = data || []; // cache
        setLoading(false);
    };

    /* ---------------- FETCH COHORTS ---------------- */
    const fetchStudentCohorts = async () => {
        if (cachedCohorts.current) {
            setExistingCohorts(cachedCohorts.current);
            fetchAnnouncements(cachedCohorts.current);
            return;
        }

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
        cachedCohorts.current = data || [];
        fetchAnnouncements(data || []);
    };

    /* ---------------- FETCH ANNOUNCEMENTS ---------------- */

    const fetchAnnouncements = async (cohorts: any[]) => {
        if (!cohorts.length) {
            setCohortMessages([]);
            return;
        }

        // if cached announcements exist and cohorts didn't change, reuse
        const cohortsKey = JSON.stringify(cohorts.map(c => `${c.tutor_id}-${c.block}-${c.year}-${c.semester}`));
        const prevKey = localStorage.getItem("cohortsKey");

        if (cachedAnnouncements.current && prevKey === cohortsKey) {
            setCohortMessages(cachedAnnouncements.current);
            // calculate unread count
            const readIds = readMessages;
            const unread = cachedAnnouncements.current.filter((msg) => !readIds.includes(msg.id)).length;
            setUnreadCount(unread);
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
        cachedAnnouncements.current = filtered;

        // store cohorts key to check if announcements should be refetched
        localStorage.setItem("cohortsKey", cohortsKey);

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
        <div className="space-y-2 mt-2 animate-fade-in">

            {/* ANNOUNCEMENTS */}
            {cohortMessages.length > 0 && (
                <Card className="relative overflow-hidden border-0 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl shadow-xl rounded-xl">
                    <CardHeader className="border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[2px] font-bold text-slate-500 dark:text-blue-500/80">Broadcasts</p>
                                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Cohort News</CardTitle>
                                </div>
                            </div>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 hover:opacity-70 transition-opacity">
                                    Mark All Read
                                </button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-2 space-y-3">
                        {cohortMessages.map((msg) => {
                            const isUnread = !readMessages.includes(msg.id);
                            return (
                                <div
                                    key={msg.id}
                                    className={`group relative p-4 rounded-xl transition-all cursor-pointer border
                                ${isUnread
                                            ? "bg-blue-50 dark:bg-blue-500/5 border-0 hover:border-blue-400"
                                            : "bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                                        }`}
                                    onClick={() => handleMarkRead(msg.id)}
                                >
                                    {isUnread && (
                                        <div className="absolute -left-1 top-4 w-1 h-8 bg-blue-500 rounded-full" />
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded ${isUnread ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                            {isUnread ? "Urgent" : "Read"}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed mb-3 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                                        {msg.message}
                                    </p>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-100 dark:border-white/5">
                                        Target: B{msg.block} • Y{msg.year} • S{msg.semester}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* --- MY TUTORS & ANNOUNCEMENTS SECTION --- */}
            <div className="space-y-6">
                <Card className="relative overflow-hidden border-0 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl shadow-xl dark:shadow-2xl rounded-xl transition-all duration-300">
                    <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[2px] font-bold text-slate-500 dark:text-emerald-500/80">Academic</p>
                                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">My Tutors</CardTitle>
                                </div>
                            </div>

                            {unreadCount > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-full">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">{unreadCount} New</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {/* JOINED COHORTS */}
                        {existingCohorts.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">Active Cohorts</h3>
                                <div className="grid gap-2">
                                    {existingCohorts.map((c, index) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl hover:border-emerald-500/30 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-white border border-white/10">
                                                    {c.profiles?.name?.[0] || "T"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {c.profiles?.name || "Tutor"}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight">
                                                        Block {c.block} • Year {c.year} • Sem {c.semester}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setLeaveTarget(c)}
                                                className="h-8 text-[10px] font-bold uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10 border border-transparent transition-all"
                                            >
                                                Leave
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TUTOR LISTING */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Available Tutors</h3>

                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="flex items-center space-x-4 p-4 border border-slate-100 dark:border-white/5 rounded-xl animate-pulse">
                                            <div className="w-12 h-12 bg-slate-200 dark:bg-white/5 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
                                                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : tutors.length === 0 ? (
                                <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">No tutors found in your institution.</p>
                                    <Button
                                        onClick={() => setInviteModalOpen(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest px-6 py-2 rounded-lg shadow-lg shadow-emerald-500/20"
                                    >
                                        Invite a Tutor
                                    </Button>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {tutors.map((tutor) => (
                                        <li
                                            key={tutor.user_id}
                                            className="flex items-center space-x-4 p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-300 group"
                                            onClick={() => setSelectedTutor(tutor)}
                                        >
                                            <Avatar className="w-12 h-12 ring-2 ring-slate-100 dark:ring-white/5 group-hover:ring-emerald-500/30 transition-all">
                                                {tutor.avatar_url ? (
                                                    <AvatarImage src={tutor.avatar_url} />
                                                ) : (
                                                    <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">{tutor.name[0]}</AvatarFallback>
                                                )}
                                            </Avatar>

                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{tutor.name}</div>
                                                <div className="text-[11px] text-slate-500 font-medium">
                                                    <span className="text-emerald-600 dark:text-emerald-500/70">@{tutor.username || "N/A"}</span> • {tutor.specialization || "N/A"}
                                                </div>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors" />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* JOIN FORM */}
                        {selectedTutor && (
                            <div className="mt-6 p-5 border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                    Join {selectedTutor.name}'s Cohort
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Enter Block (e.g., A1)"
                                        value={block}
                                        onChange={(e) => setBlock(e.target.value)}
                                        className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(Number(e.target.value))}
                                            className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none"
                                        >
                                            <option value="">Select Year</option>
                                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                        </select>

                                        <select
                                            value={semester}
                                            onChange={(e) => setSemester(Number(e.target.value))}
                                            className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none"
                                        >
                                            <option value="">Select Semester</option>
                                            <option value={1}>Semester 1</option>
                                            <option value={2}>Semester 2</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setSelectedTutor(null)}
                                            className="flex-1 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleJoinTutor}
                                            disabled={joining}
                                            className="flex-[2] bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                        >
                                            {joining ? "Verifying..." : "Join Cohort"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {/* LEAVE MODAL */}

            <Dialog open={!!leaveTarget} onOpenChange={() => setLeaveTarget(null)}>
                <DialogContent className="sm:max-w-[400px] border-none bg-white dark:bg-slate-950 p-0 overflow-hidden rounded-3xl shadow-2xl">
                    {/* Top Danger Bar - Visual Cue for Destructive Action */}
                    <div className="h-2 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

                    <div className="p-8">
                        <div className="flex flex-col items-center text-center">
                            {/* Warning Icon with Soft Glow */}
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-full">
                                <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-500 animate-pulse">
                                    <Users className="w-8 h-8" />
                                </div>
                            </div>

                            <DialogHeader className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[3px] font-bold text-red-500 dark:text-red-400">
                                    Departure Confirmation
                                </p>
                                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                    Leaving this cohort?
                                </DialogTitle>
                            </DialogHeader>

                            <div className="mt-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    You are about to disconnect from <span className="font-bold text-slate-900 dark:text-slate-200">
                                        {leaveTarget?.profiles?.name || "this tutor"}'s</span> broadcasts.
                                    You will no longer receive live updates or announcements.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons with High-End Styling */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <Button
                                variant="ghost"
                                onClick={() => setLeaveTarget(null)}
                                className="flex-1 order-2 sm:order-1 font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                Stay in Cohort
                            </Button>
                            <Button
                                onClick={confirmLeave}
                                className="flex-1 order-1 sm:order-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 py-6 transition-all"
                            >
                                Confirm Leave
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* YOUR ENTIRE ORIGINAL UI REMAINS EXACTLY AS YOU PROVIDED */}
            {/* (No deletions, nothing removed) */}
            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-950 p-0 overflow-hidden rounded-3xl shadow-2xl transition-all">
                    {/* Top Growth Bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

                    <div className="p-8">
                        {/* Header Section */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>

                            <DialogHeader className="space-y-1">
                                <p className="text-[10px] uppercase tracking-[3px] font-bold text-emerald-600 dark:text-emerald-500">
                                    Community Growth
                                </p>
                                <DialogTitle className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Invite a Tutor
                                </DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-[320px]">
                                Expand your learning circle. Invite experts to guide your cohort and share vital updates.
                            </p>
                        </div>

                        {/* Visual Step Guide */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[
                                { step: "01", label: "Copy link" },
                                { step: "02", label: "Open WhatsApp" },
                                { step: "03", label: "Send Invite" }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center space-y-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5">
                                        {item.step}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter leading-tight">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Message Preview Box */}
                        <div className="relative group bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-5 mb-6">
                            <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase">
                                Message Preview
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic line-clamp-4">
                                "Hello! This platform helps students connect with knowledgeable tutors. By joining, you can guide students, answer questions, and post helpful announcements..."
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 truncate">medrae.vercel.app</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                    `Hello!

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
                                className="w-full"
                            >
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-[1px] py-6 shadow-lg shadow-emerald-500/20 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    Invite via WhatsApp
                                    <ArrowUpRight className="w-4 h-4" />
                                </Button>
                            </a>

                            <Button
                                variant="ghost"
                                onClick={() => setInviteModalOpen(false)}
                                className="w-full text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}