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

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [tutorName, setTutorName] = useState("");

  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showStudentOverlay, setShowStudentOverlay] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  // Replace single selectedStudent with an array
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [block, setBlock] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [semester, setSemester] = useState<number | "">("");
  const [joining, setJoining] = useState(false);
  const [search, setSearch] = useState("");
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

    // 1️⃣ Get the last login activity
    const { data: lastLogin } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .order("login_date", { ascending: false })
      .limit(1);

    let newStreak = 1;
    let previousBest = 1;

    if (lastLogin && lastLogin.length > 0) {
      const last = lastLogin[0];
      const lastDate = new Date(last.login_date);
      const diffDays = Math.floor(
        (new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // Already logged in today → use stored streak
        newStreak = last.streak || 1;
        previousBest = last.best_streak || newStreak;
      } else if (diffDays === 1) {
        // Continued streak
        newStreak = (last.streak || 0) + 1;
        previousBest = Math.max(last.best_streak || 0, newStreak);
      } else {
        // Missed day → reset streak
        newStreak = 1;
        previousBest = last.best_streak || 1;
      }
    }

    // 2️⃣ Upsert today's login activity
    await supabase
      .from("login_activity")
      .upsert(
        {
          user_id: user.id,
          login_date: today,
          streak: newStreak,
          best_streak: previousBest,
        },
        { onConflict: ["user_id", "login_date"] }
      );

    // 3️⃣ Update state
    setStreak(newStreak);
    setBestStreak(previousBest);
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
      .select(`
      user_id,
      name,
      username,
      block,
      county,
      institution,
      course,
      specialization,
      nck_number,
      email,
      phone,
      avatar_url
    `)
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
    <div className="min-h-screen flex justify-center bg-transparent py-1 pt-0 px-2">
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
          <Card
            className="hover:shadow-xl transition-shadow duration-300 border-0 relative overflow-hidden h-64"
            style={{
              backgroundImage: `url('/tutor.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40 dark:bg-black/50"></div>

            <CardHeader className="flex items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white">
                Login Streak
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-300" />
            </CardHeader>

            <CardContent className="relative z-10">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-white">
                  {streak} days
                </div>
                <div className="text-xs text-gray-200">
                  Best: {bestStreak} days
                </div>
              </div>
              <div className="text-xs text-gray-200 mt-1">Keep it going!</div>
            </CardContent>
          </Card>
          <Card
            className="hover:shadow-xl transition-shadow duration-300 border-0 relative overflow-hidden h-64"
            style={{
              backgroundImage: `url('/linked.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Optional overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40 dark:bg-black/50"></div>

            <CardHeader className="flex items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-100">
                Linked Students
              </CardTitle>
              <Users className="h-4 w-4 text-gray-300" />
            </CardHeader>

            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-white">
                {linkedStudents.length}
              </div>
              <div className="text-xs text-gray-200">Students in your cohorts</div>
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
              <Button
                onClick={() => setShowStudentOverlay(true)}
                className="w-full text-left rounded-xl border px-3 py-2
             bg-gray-50 dark:bg-gray-800
             text-gray-900 dark:text-gray-100
             hover:bg-gray-100 dark:hover:bg-gray-700
             transition-colors duration-200"
              >
                {selectedStudents.length > 0
                  ? selectedStudents.map((s) => s.name).join(", ")
                  : "Select Students"}
              </Button>
              <input
                type="text"
                placeholder="Block (e.g., A)"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="border rounded-xl p-2 bg-white dark:bg-gray-800 border-0 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Year (e.g., 1)"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border rounded-xl p-2 bg-white dark:bg-gray-800 border-0 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Semester (e.g., 1)"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="border rounded-xl p-2 bg-white dark:bg-gray-800 border-0 dark:text-gray-100"
              />
              <Button onClick={handleAddStudent} disabled={joining}>
                {joining ? "Adding..." : "Add Student"}
              </Button>

            </div>

            {/* Student Overlay */}
            {showStudentOverlay && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-md sm:max-w-3xl lg:max-w-7xl max-h-[95vh] flex flex-col shadow-xl">

                  {/* STICKY HEADER */}
                  <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b p-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Select Students
                    </h3>

                    {/* Visible X Close */}
                    <button
                      onClick={() => setShowStudentOverlay(false)}
                      className="text-2xl font-bold text-gray-600 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>

                  {/* STICKY SEARCH BAR */}
                  <div className="sticky top-[64px] z-10 bg-white dark:bg-gray-900 border-b p-3">
                    <input
                      type="text"
                      placeholder="Search students..."
                      className="w-full p-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase();
                        setSearch(value);
                      }}
                    />
                  </div>

                  {/* STUDENT LIST */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                      {allStudents
                        .filter((s) =>
                          s.name?.toLowerCase().includes(search) ||
                          s.username?.toLowerCase().includes(search) ||
                          s.email?.toLowerCase().includes(search)
                        )
                        .map((s) => {
                          const isSelected = selectedStudents.some(
                            (st) => st.user_id === s.user_id
                          );

                          return (
                            <div
                              key={s.user_id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedStudents((prev) =>
                                    prev.filter((st) => st.user_id !== s.user_id)
                                  );
                                } else {
                                  setSelectedStudents((prev) => [...prev, s]);
                                }
                              }}
                              className={`flex flex-col space-y-1 p-3 rounded-xl cursor-pointer border hover:bg-gray-100 dark:hover:bg-gray-800 transition
                  ${isSelected ? "bg-blue-200 dark:bg-blue-800" : ""}`}
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  {s.avatar_url ? (
                                    <img
                                      src={s.avatar_url}
                                      alt={s.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback>
                                      <img
                                        src="/UsersAvatar.jpg"
                                        alt={s.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </AvatarFallback>
                                  )}
                                </Avatar>

                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {s.name}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {s.username}
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-gray-700 dark:text-gray-300 ml-12 space-y-1">
                                {s.email && (
                                  <div>
                                    <strong>Email:</strong> {s.email}
                                  </div>
                                )}
                                {s.phone && (
                                  <div>
                                    <strong>Phone:</strong> {s.phone}
                                  </div>
                                )}
                                {s.county && (
                                  <div>
                                    <strong>County:</strong> {s.county}
                                  </div>
                                )}
                                {s.institution && (
                                  <div>
                                    <strong>Institution:</strong> {s.institution}
                                  </div>
                                )}
                                {s.course && (
                                  <div>
                                    <strong>Course:</strong> {s.course}
                                  </div>
                                )}
                                {s.block && (
                                  <div>
                                    <strong>Block:</strong> {s.block}
                                  </div>
                                )}
                                {s.specialization && (
                                  <div>
                                    <strong>Specialization:</strong> {s.specialization}
                                  </div>
                                )}
                                {s.nck_number && (
                                  <div>
                                    <strong>NCK Number:</strong> {s.nck_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* STICKY BOTTOM BUTTON */}
                  <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t p-4">
                    <Button
                      onClick={async () => {
                        if (selectedStudents.length === 0 || !block || !year || !semester) {
                          toast.error("Please select students and fill all fields.");
                          return;
                        }

                        setJoining(true);

                        const inserts = selectedStudents.map((st) => ({
                          tutor_id: user.id,
                          student_id: st.user_id,
                          block,
                          year,
                          semester,
                        }));

                        const { error } = await supabase
                          .from("tutor_students")
                          .insert(inserts);

                        if (error) {
                          toast.error(error.message);
                        } else {
                          toast.success(`${selectedStudents.length} students added.`);
                          setSelectedStudents([]);
                          setBlock("");
                          setYear("");
                          setSemester("");
                          setShowStudentOverlay(false);
                          fetchLinkedStudents();
                        }

                        setJoining(false);
                      }}
                      disabled={joining}
                      className="w-full"
                    >
                      {joining
                        ? "Adding..."
                        : `Add Selected Students (${selectedStudents.length})`}
                    </Button>
                  </div>
                </div>
              </div>
            )}


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
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 border rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>

                      <div className="flex flex-col space-y-1">
                        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>

                    <div className="h-6 w-14 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
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
                      <CardTitle className="text-gray-900 dark:text-gray-100">
                        {loadingStudents ? (
                          <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                        ) : (
                          cohort
                        )}
                      </CardTitle>
                      <span
                        className={`${cohortColors[index % cohortColors.length]} px-2 py-1 rounded-xl text-white text-xs ${loadingStudents ? "bg-gray-300 dark:bg-gray-700 animate-pulse" : ""
                          }`}
                      >
                        {loadingStudents ? "\u00A0" : cohort.split(" - ").join(" | ")}
                      </span>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {loadingStudents
                        ? // Skeleton placeholders for students
                        [...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 border rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                              <div className="flex flex-col space-y-1">
                                <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
                                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                              </div>
                            </div>
                            <div className="h-6 w-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
                          </div>
                        ))
                        : // Original student mapping preserved
                        students.map((s) => (
                          <div
                            key={s.student_id}
                            onClick={() => setSelectedUserId(s.student_id)}
                            className="flex items-center justify-between p-2 border rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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
                                const confirmDelete = window.confirm(
                                  `Are you sure you want to remove ${s.profiles.name}?`
                                );
                                if (!confirmDelete) return;
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

                <UserProfileModal
                  userId={selectedUserId}
                  onClose={() => setSelectedUserId(null)}
                />
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>

  );
}
