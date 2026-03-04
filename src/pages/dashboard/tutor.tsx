"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Users, Clock, Loader2, GraduationCap, UserPlus } from "lucide-react";
import CohortAnnouncement from "@/components/CohortAnnouncement";

const cohortColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-yellow-500", "bg-pink-500"];

export default function TutorDashboard() {
  const user = useUser();


  const [tutorName, setTutorName] = useState("");
  const [streak, setStreak] = useState(0);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [block, setBlock] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [semester, setSemester] = useState<number | "">("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTutorName();
      fetchLoginStreak();
      fetchLinkedStudents();
      fetchAllStudents();
    }
  }, [user]);

  const fetchTutorName = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user?.id)
      .single();
    setTutorName(error ? "Tutor" : data?.name || "Tutor");
  };

  const fetchLoginStreak = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .single();

    if (existing) {
      setStreak(existing.streak || 1);
      return;
    }

    const { data: lastLogin } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .order("login_date", { ascending: false })
      .limit(1);

    let newStreak = 1;
    if (lastLogin && lastLogin.length > 0) {
      const lastDate = new Date(lastLogin[0].login_date);
      const diffDays = Math.floor(
        (new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) newStreak = (lastLogin[0].streak || 0) + 1;
    }

    await supabase.from("login_activity").insert({
      user_id: user.id,
      login_date: today,
      streak: newStreak,
    });

    setStreak(newStreak);
  };

  const fetchLinkedStudents = async () => {
    setLoadingStudents(true);
    if (!user?.id) return setLoadingStudents(false);

    const { data, error } = await supabase
      .from("tutor_students")
      .select(`
        id,
        student_id,
        tutor_id,
        block,
        year,
        semester,
        profiles!tutor_students_student_id_fkey(name, username)
      `)
      .eq("tutor_id", user.id)
      .order("block", { ascending: true })
      .order("year", { ascending: true })
      .order("semester", { ascending: true });

    if (error) {
      toast.error(error.message);
    }

    setLinkedStudents(data || []);
    setLoadingStudents(false);
  };

  const fetchAllStudents = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("institution")
      .eq("user_id", user?.id)
      .single();

    if (!profile?.institution) return;

    const { data: students } = await supabase
      .from("profiles")
      .select("user_id, name, username, block")
      .eq("role", "student")
      .eq("institution", profile.institution);

    setAllStudents(students || []);
  };

  const handleAddStudent = async () => {
    if (!selectedStudent || !block || !year || !semester) {
      toast.error("Please fill all fields before adding a student.");
      return;
    }
    setJoining(true);
    const { error } = await supabase.from("tutor_students").insert({
      tutor_id: user.id,
      student_id: selectedStudent.user_id,
      block,
      year,
      semester,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Student ${selectedStudent.name} added to your list.`);
      setSelectedStudent(null);
      setBlock("");
      setYear("");
      setSemester("");

    }
    setJoining(false);
  };

  const handleRemoveStudent = async (studentId: string) => {
    const { error } = await supabase
      .from("tutor_students")
      .delete()
      .eq("tutor_id", user.id)
      .eq("student_id", studentId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Student removed from your list.");
      setLinkedStudents((prev) => prev.filter((s) => s.student_id !== studentId));
    }
  };

  return (
    <div className="min-h-screen flex justify-center bg-transparent py-1 px-2">
      <div className="w-full max-w-4xl space-y-2">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {tutorName}! 👨‍⚕️
          </h1>
          <div className="text-white/90">
            Here's your impact overview. You can manage your students and cohorts.
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Login Streak
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{streak} days</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Keep it going!</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Linked Students
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {linkedStudents.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Students in your cohorts</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Student */}
        <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
          <CardHeader className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            <CardTitle className="text-gray-900 dark:text-gray-100">
              Add Student to Your Cohort
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <select
                value={selectedStudent?.user_id || ""}
                onChange={(e) =>
                  setSelectedStudent(allStudents.find((s) => s.user_id === e.target.value) || null)
                }
                className="border rounded p-2 bg-white dark:bg-gray-700 border-0 dark:text-gray-100"
              >
                <option value="">Select Student</option>
                {allStudents.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.name} ({s.username}) - Block: {s.block || "-"}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Block (e.g., A)"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="border rounded p-2 bg-white dark:bg-gray-700 border-0 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Year (e.g., 1)"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border rounded p-2 bg-white dark:bg-gray-700 border-0 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Semester (e.g., 1)"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="border rounded p-2 bg-white dark:bg-gray-700 border-0 dark:text-gray-100"
              />
              <Button onClick={handleAddStudent} disabled={joining}>
                {joining ? "Adding..." : "Add Student"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <CohortAnnouncement linkedStudents={linkedStudents} colors={cohortColors} />

        {/* Linked Students List */}
        <Card className="hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0">
          <CardHeader className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            <CardTitle className="text-gray-900 dark:text-gray-100">Your Cohort Students</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="flex justify-center items-center space-x-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="animate-spin h-4 w-4" /> Loading students...
              </div>
            ) : linkedStudents.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No students linked to your cohorts yet.
              </div>
            ) : (
              <>
                {Object.entries(
                  linkedStudents.reduce((acc: any, s) => {
                    const key = `Block ${s.block} - Year ${s.year} - Sem ${s.semester}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(s);
                    return acc;
                  }, {})
                ).map(([cohort, students], index) => (
                  <Card
                    key={cohort}
                    className="hover:shadow-xl transition-shadow duration-300 mb-2 dark:bg-gray-900 border-0"
                  >
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="text-gray-900 dark:text-gray-100">{cohort}</CardTitle>
                      <span className={`${cohortColors[index % cohortColors.length]} px-2 py-1 rounded text-white text-xs`}>
                        {cohort.split(" - ").join(" | ")}
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {students.map((s) => (
                        <div
                          key={s.student_id}
                          onClick={() => setSelectedUserId(s.student_id)}
                          className="flex items-center justify-between p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar>
                              {s.profiles.avatar_url ? (
                                <img
                                  src={s.profiles.avatar_url}
                                  alt={s.profiles.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <AvatarFallback>
                                  <img
                                    src="/UsersAvatar.jpg"
                                    alt={s.profiles.name}
                                    className="w-full h-full object-cover"
                                  />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {s.profiles.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {s.profiles.username}
                              </div>
                            </div>
                          </div>

                          {/* Remove button */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening modal
                              const confirmDelete = window.confirm(`Are you sure you want to remove ${s.profiles.name}?`);
                              if (!confirmDelete) return; // Stop if user cancels
                              handleRemoveStudent(s.student_id);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </CardContent>
        </Card>
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />

      </div>
    </div>
  );
}