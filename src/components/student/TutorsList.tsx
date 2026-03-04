"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Megaphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TutorsList() {
    const user = useUser();
    const [tutors, setTutors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTutor, setSelectedTutor] = useState<any>(null);
    const [block, setBlock] = useState("");
    const [year, setYear] = useState<number | "">("");
    const [semester, setSemester] = useState<number | "">("");
    const [joining, setJoining] = useState(false);
    const [cohortMessages, setCohortMessages] = useState<any[]>([]);
    const [existingCohorts, setExistingCohorts] = useState<string[]>([]);

    useEffect(() => {
        if (user?.id) {
            fetchTutors();
            fetchStudentCohorts();
            fetchAnnouncements();
        }
    }, [user]);

    const fetchTutors = async () => {
        setLoading(true);
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("institution")
            .eq("user_id", user?.id)
            .single();

        if (profileError || !profile?.institution) {
            setTutors([]);
            setLoading(false);
            return;
        }

        const { data: tutorsData, error: tutorsError } = await supabase
            .from("profiles")
            .select("user_id, name, username, specialization, avatar_url")
            .eq("role", "tutor")
            .eq("institution", profile.institution);

        if (tutorsError) setTutors([]);
        else setTutors(tutorsData || []);
        setLoading(false);
    };

    const fetchStudentCohorts = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from("tutor_students")
            .select("tutor_id, block, year, semester")
            .eq("student_id", user.id);

        const existing = (data || []).map(
            (d) => `${d.tutor_id}|${d.block}|${d.year}|${d.semester}`
        );
        setExistingCohorts(existing);
    };

    const fetchAnnouncements = async () => {
        if (!user?.id) return;
        const { data: profile } = await supabase
            .from("profiles")
            .select("institution")
            .eq("user_id", user?.id)
            .single();

        if (!profile?.institution) return;

        const { data } = await supabase
            .from("cohort_messages")
            .select("*")
            .order("created_at", { ascending: false });

        const relevant = (data || []).filter((msg) =>
            existingCohorts.includes(`${msg.tutor_id}|${msg.block}|${msg.year}|${msg.semester}`)
        );

        setCohortMessages(relevant);
    };

    const handleJoinTutor = async () => {
        if (!selectedTutor || !block || !year || !semester) return;

        const key = `${selectedTutor.user_id}|${block}|${year}|${semester}`;
        if (existingCohorts.includes(key)) {
            toast.error(`You are already in this tutor's cohort!`);
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
            setSelectedTutor(null);
            setBlock("");
            setYear("");
            setSemester("");
            fetchStudentCohorts();
            fetchAnnouncements();
        }
        setJoining(false);
    };

    return (
        <div className="space-y-2 mt-2">

            {/* ---------------- Tutors ---------------- */}
            <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
                <CardHeader className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-green-400 dark:text-green-300" />
                    <CardTitle className="text-gray-900 dark:text-gray-100">Your Tutors</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                            <Loader2 className="animate-spin h-4 w-4" /> Loading tutors...
                        </div>
                    ) : tutors.length === 0 ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            No tutors found in your institution.
                        </div>
                    ) : selectedTutor ? (
                        <div className="space-y-3">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                Confirm details to join <span className="text-blue-600 dark:text-blue-400">{selectedTutor.name}</span>
                            </h3>
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="text"
                                    placeholder="Your Block (e.g., A)"
                                    value={block}
                                    onChange={(e) => setBlock(e.target.value)}
                                    className="border rounded p-2 dark:bg-gray-700 border-0 dark:text-gray-100"
                                />
                                <input
                                    type="number"
                                    placeholder="Year (e.g., 1)"
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="border rounded p-2 dark:bg-gray-700 border-0 dark:text-gray-100"
                                />
                                <input
                                    type="number"
                                    placeholder="Semester (e.g., 1)"
                                    value={semester}
                                    onChange={(e) => setSemester(Number(e.target.value))}
                                    className="border rounded p-2 dark:bg-gray-700 border-0 dark:text-gray-100"
                                />
                                <div className="flex space-x-2 mt-2">
                                    <Button onClick={handleJoinTutor} disabled={joining}>
                                        {joining ? "Joining..." : "Join Tutor"}
                                    </Button>
                                    <Button variant="secondary" onClick={() => setSelectedTutor(null)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {tutors.map((tutor) => (
                                <li
                                    key={tutor.user_id}
                                    className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    onClick={() => setSelectedTutor(tutor)}
                                >
                                    <Avatar className="w-10 h-10">
                                        {tutor.avatar_url ? (
                                            <AvatarImage src={tutor.avatar_url} />
                                        ) : (
                                            <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{tutor.name}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            @{tutor.username || "N/A"} | {tutor.specialization || "N/A"}
                                        </div>
                                    </div>
                                    <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>

                {/* ---------------- Announcements ---------------- */}
                {cohortMessages.length > 0 && (
                    <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
                        <CardHeader className="flex items-center space-x-2">
                            <Megaphone className="w-5 h-5 text-blue-400 dark:text-blue-300" />
                            <CardTitle className="text-gray-900 dark:text-gray-100">
                                Your Cohort Announcements
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {cohortMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="p-3 border rounded-md bg-gray-100 dark:bg-gray-900 border-gray-200 border-0 flex justify-between items-start hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                                >
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {msg.message}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            Cohort: {msg.block} | Year: {msg.year} | Semester: {msg.semester}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

            </Card>
        </div>
    );
}