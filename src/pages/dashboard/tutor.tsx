"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Using React Router
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Icons
import { Users, Clock, Video, Loader2 } from "lucide-react";

export default function TutorDashboard() {
  const user = useUser();
  const navigate = useNavigate();
  


  // Tutor-specific states
  const [tutorName, setTutorName] = useState("");
  const [streak, setStreak] = useState(0);
  const [matchingStudents, setMatchingStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Daily content states
  const [dailyContent, setDailyContent] = useState("");
  const [dailyDuration, setDailyDuration] = useState<"24h" | "1w" | "1m" | "3m">("24h");
  const [dailyImage, setDailyImage] = useState<File | null>(null);
  const [dailyPosts, setDailyPosts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [latestPostId, setLatestPostId] = useState<string | null>(null);

  // Post a new daily status
const handlePostDaily = async () => {
  if (!user?.id) return;

  let image_url = null;
  if (dailyImage) {
    const { data, error } = await supabase
      .storage
      .from("statuspics")
      .upload(`${user.id}/${Date.now()}_${dailyImage.name}`, dailyImage);

    if (!error && data) {
      const { data: urlData } = await supabase
        .storage
        .from("statuspics")
        .getPublicUrl(data.path);
      image_url = urlData.publicUrl;
    }
  }

  const { data: post, error: insertError } = await supabase
    .from("daily_posts")
    .insert({
      user_id: user.id,
      content: dailyContent,
      image_url,
      duration: dailyDuration,
    })
    .select()
    .single();

  if (!insertError && post) {
    setDailyPosts([post, ...dailyPosts]);
    setDailyContent("");
    setDailyImage(null);
    setLatestPostId(post.id);
  }
};

const handlePostClick = async () => {
  try {
    setUploading(true);
    await handlePostDaily();
    toast({ title: "Success", description: "Your daily post was uploaded!" });
  } catch {
    toast({
      title: "Error",
      description: "Something went wrong while posting.",
      variant: "destructive",
    });
  } finally {
    setUploading(false);
  }
};

// Delete a post
const handleDeletePost = async (postId: string, postUserId: string) => {
  if (user?.id !== postUserId) return;

  if (!confirm("Are you sure you want to delete this post?")) return;

  const { error } = await supabase.from("daily_posts").delete().eq("id", postId);
  if (!error) {
    setDailyPosts((prev) => prev.filter((p) => p.id !== postId));
    toast({ title: "Deleted", description: "Your post was successfully deleted." });
  }
};

// Fetch posts
const fetchDailyPosts = async () => {
  const { data: posts, error } = await supabase
    .from("valid_daily_posts") // 👈 query the view
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && posts) {
    setDailyPosts(posts);
    if (posts.length > 0) setLatestPostId(posts[0].id);
  }
};

// Initial + auto refresh
useEffect(() => {
  fetchDailyPosts();
  const interval = setInterval(fetchDailyPosts, 60000);
  return () => clearInterval(interval);
}, [latestPostId]);


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
<Card className="lg:col-span-3 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-gray-900 dark:text-white">💖 Heartique Daily Status</CardTitle>
    <CardDescription className="text-gray-700 dark:text-gray-300">
      This section is designed not just for posting daily thoughts, personal reflections, or fun images, but as a dedicated space where nursing and medical professionals can learn, reflect, and inspire each other. Every note, idea, or snapshot you share has the potential to enrich others, spark meaningful discussion, provide insight into practical healthcare experiences, and offer real-life lessons from the medical field. Think of this as a daily mini-journal for your professional growth, where small learnings, important observations, and unique experiences are carefully captured, shared, and preserved so that they can be revisited and learned from in the future. Contributions here should aim to be educational, informative, or thought-provoking, helping yourself and your peers grow in knowledge, clinical reasoning, and professional awareness. Posting anything that is irrelevant, uneducative, or not aligned with the learning purpose may lead to removal of the content or, in serious cases, a ban from the site. By participating responsibly, you are creating content that is memorable, educational, inspiring, and meaningful, contributing to a community of learners who support and uplift each other every day.
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    <textarea
      className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Write today's thought..."
      value={dailyContent}
      onChange={(e) => setDailyContent(e.target.value)}
    />

    <div className="flex items-center gap-2 mt-2">
      <label className="text-gray-900 dark:text-white text-sm">Visible for:</label>
      <select
        value={dailyDuration}
        onChange={(e) => setDailyDuration(e.target.value as any)}
        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm p-1 rounded"
      >
        <option value="24h">24 Hours</option>
        <option value="1w">1 Week</option>
        <option value="1m">1 Month</option>
        <option value="3m">3 Months</option>
      </select>
    </div>

    <input
      type="file"
      accept="image/*"
      onChange={(e) => setDailyImage(e.target.files ? e.target.files[0] : null)}
      className="text-gray-900 dark:text-white"
    />

    <Button onClick={handlePostClick} className="w-full mt-2" disabled={uploading}>
      {uploading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading...
        </>
      ) : (
        "Post"
      )}
    </Button>

    {/* Display recent daily posts */}
    <div className="space-y-3 mt-4">
      {dailyPosts.length > 0 ? dailyPosts.map((post) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* User Info */}
            <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-2">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-500 flex items-center justify-center text-gray-900 dark:text-white">
                  {post.profiles?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{post.profiles?.full_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">@{post.profiles?.username}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{post.profiles?.institution}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{post.profiles?.county}</p>
            </div>

            {/* Post Content & Image */}
            <div className="flex-1 flex flex-col gap-2">
              {post.content && <p className="text-gray-900 dark:text-white">{post.content}</p>}
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="daily"
                  className="rounded w-full max-h-96 object-contain bg-gray-100 dark:bg-black cursor-pointer"
                  onClick={() => setFullscreenImage(post.image_url)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>

            {/* Delete Button */}
            {user?.id === post.user_id && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto md:ml-0 mt-2 md:mt-0"
                onClick={() => handleDeletePost(post.id, post.user_id)}
              >
                Delete
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} • 
            Expires on {new Date(post.expires_at).toLocaleString()}
          </p>
        </motion.div>
      )) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No posts yet.</p>
      )}
    </div>
  </CardContent>

  {/* Fullscreen modal */}
  {fullscreenImage && (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={() => setFullscreenImage(null)}
    >
      <img
        src={fullscreenImage}
        alt="fullscreen"
        className="max-w-full max-h-full object-contain rounded"
      />
    </div>
  )}
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
