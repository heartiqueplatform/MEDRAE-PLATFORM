"use client";

import { Users, Clock, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Using React Router
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

export default function TutorDashboard() {
  const user = useUser();
  const navigate = useNavigate(); // React Router hook
  const [tutorName, setTutorName] = useState("");
  const [streak, setStreak] = useState(0);
  const [matchingStudents, setMatchingStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTutorName();
      fetchLoginStreak();
      fetchMatchingStudents();
    }
  }, [user]);

  const fetchTutorName = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user?.id)
      .single();
    if (error) {
      console.error("Error fetching tutor name:", error);
      setTutorName("Tutor");
      return;
    }
    setTutorName(data?.name || "Tutor");
  };

  const fetchLoginStreak = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: existing, error: existingError } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .single();
    if (existing) {
      setStreak(existing.streak || 1);
      return;
    }
    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error fetching today's streak:", existingError);
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

    const { error: insertError } = await supabase.from("login_activity").insert({
      user_id: user.id,
      login_date: today,
      streak: newStreak,
    });
    if (insertError) console.error("Error inserting new streak:", insertError);
    setStreak(newStreak);
  };

  const fetchMatchingStudents = async () => {
    setLoadingStudents(true);
    if (!user?.id) {
      setMatchingStudents([]);
      setLoadingStudents(false);
      return;
    }

    const { data: tutorProfile, error: tutorError } = await supabase
      .from("profiles")
      .select("institution, county")
      .eq("user_id", user.id)
      .single();

    if (tutorError || !tutorProfile) {
      console.error("Error fetching tutor profile:", tutorError);
      setMatchingStudents([]);
      setLoadingStudents(false);
      return;
    }

    const { institution: tutorInstitution, county: tutorCounty } = tutorProfile;
    if (!tutorInstitution || !tutorCounty) {
      console.warn("Tutor institution or county is empty, cannot match students");
      setMatchingStudents([]);
      setLoadingStudents(false);
      return;
    }

    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select("user_id, name, username, block")
      .eq("role", "student")
      .ilike("institution", tutorInstitution)
      .ilike("county", tutorCounty);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      setMatchingStudents([]);
      setLoadingStudents(false);
      return;
    }

    const matchedStudents = (students || []).map((s) => ({
      ...s,
      studentName: s.name,
    }));

    setMatchingStudents(matchedStudents);
    setLoadingStudents(false);
  };

  // Navigate to MedTube page
  const handlePostVideo = () => {
    navigate("/medtube");
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-healing rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {tutorName}! 👨‍⚕️
        </h1>
        <div className="text-white/90">
          You're making a difference in nursing education. Here's your impact overview.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login Streak</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak} days</div>
            <div className="text-xs text-muted-foreground">Keep it going!</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matching Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <div className="text-xs text-muted-foreground">
              Soon, you will see students from your institution & county that match your teaching profile.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matching Students List */}
      <Card className="hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>🎓 Matching Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            This section is under development. In the future, you will be able to view and interact with students who align with your institution and teaching focus. For now, focus on sharing educational content via "Post New Video".
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-start hover:bg-blue-50 transition-colors duration-200"
            variant="outline"
            onClick={handlePostVideo}
          >
            <Video className="mr-2 h-4 w-4 text-blue-500" />
            Post New Video
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
