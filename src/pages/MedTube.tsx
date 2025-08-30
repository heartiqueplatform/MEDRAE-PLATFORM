"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, Eye, Heart, Clock, Search, Upload, TrendingUp, Calendar,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

export function MedTube() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>("00:00");

  const categories = [
    { id: "trending", name: "Trending", icon: TrendingUp },
    { id: "recent", name: "Recent", icon: Calendar },
    { id: "emergency", name: "Emergency Medicine", icon: Play },
    { id: "pharmacology", name: "Pharmacology", icon: Play },
    { id: "clinical", name: "Clinical Skills", icon: Play },
    { id: "conditions", name: "Medical Conditions", icon: Play },
    { id: "mine", name: "My Uploads", icon: Upload },
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);

    const { data: videosData, error } = await supabase
      .from("medtube_videos")
      .select("*")
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      setLoading(false);
      return;
    }

const enrichedVideos = await Promise.all(
  videosData.map(async (video) => {
    // Check if video is blocked or premium
const isBlocked = video.block === 'true' || video.is_visible === false;
const isPremium = video.is_premium === true;
const isFreeVideo = video.is_free === true;

// Enforce access rules
const canAccess =
  !isBlocked &&
  (
    isFreeVideo ||                  // Free videos are always accessible
    (isPremium && user?.is_premium) // Premium videos accessible only to premium users
  );


    const [likesRes, viewsRes, uploaderRes] = await Promise.all([
      supabase
        .from("medtube_video_likes")
        .select("user_id")
        .eq("video_id", video.id),
      supabase
        .from("medtube_video_views")
        .select("id")
        .eq("video_id", video.id),
      supabase
        .from("profiles")
        .select("username, name")
        .eq("user_id", video.uploaded_by)
        .single()
    ]);

    return {
      ...video,
      likes_count: likesRes.data?.length ?? 0,
      views_count: viewsRes.data?.length ?? 0,
      uploader: uploaderRes.data?.username || uploaderRes.data?.name || "Unknown",
      liked_by_me: likesRes.data?.some((like) => like.user_id === user?.id),
      isBlocked,
      canAccess,
    };
  })
);

    setVideos(enrichedVideos);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [user]);

  const recordView = async (videoId: string) => {
    if (!user || !videoId) return;

    try {
      const { data, error } = await supabase
      .from("medtube_video_views")
      .upsert({ video_id: videoId, user_id: user.id }, { onConflict: ["video_id", "user_id"] });
      if (!error) {
      setVideos((prev) =>
      prev.map((v) =>
      v.id === videoId
        ? { ...v, views_count: v.views_count + 1 }
        : v
    )
  );
}
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  const handleLikeToggle = async (videoId: string) => {
    if (!user) return alert("Login to like");

    const { data: existingLike } = await supabase
      .from("medtube_video_likes")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .single();

    if (existingLike) {
      await supabase
        .from("medtube_video_likes")
        .delete()
        .eq("id", existingLike.id);
    } else {
      await supabase
        .from("medtube_video_likes")
        .insert({ video_id: videoId, user_id: user.id });
    }

   setVideos((prev) =>
  prev.map((v) =>
    v.id === videoId
      ? {
          ...v,
          liked_by_me: !v.liked_by_me,
          likes_count: v.liked_by_me
            ? v.likes_count - 1
            : v.likes_count + 1,
        }
      : v
  )
);

  };

  const formatViews = (views: number) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
    return views?.toString() ?? "0";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks ago`;
    return `${Math.ceil(days / 30)} months ago`;
  };

  const handleUpload = async () => {
    if (!file || !title || !user || !category) return alert("Login and fill in all fields");
    setUploading(true);

    const filename = `${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
    const { data, error: uploadError } = await supabase
      .storage
      .from("videos")
      .upload(filename, file);

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      alert("Upload failed");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("videos")
      .getPublicUrl(filename);

    const videoUrl = publicUrlData?.publicUrl;
    const userId = user.id;

    const { error: insertError } = await supabase.from("medtube_videos").insert({
      title,
      description,
      video_url: videoUrl,
      uploaded_by: userId,
      tags: tags.split(",").map((t) => t.trim()),
      duration,
      is_visible: true,
      category,
    });

    if (insertError) {
      console.error("Database Insert Error:", insertError);
      alert("Database error");
    } else {
      alert("Upload successful");
      setTitle("");
      setDescription("");
      setTags("");
      setFile(null);
      setCategory("");
      setPreviewUrl(null);
      setDuration("00:00");
      setShowUploadForm(false);
      fetchVideos();
    }

    setUploading(false);
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      const video = document.createElement("video");
      video.src = url;
      video.onloadedmetadata = () => {
        const mins = Math.floor(video.duration / 60).toString().padStart(2, "0");
        const secs = Math.floor(video.duration % 60).toString().padStart(2, "0");
        setDuration(`${mins}:${secs}`);
      };
    }
  }, [file]);

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">MedTube</h1>
          <p className="text-muted-foreground mt-2">Educational videos for nursing and medical education</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowUploadForm(!showUploadForm)}>
          <Upload className="h-4 w-4" /> Upload Video
        </Button>
      </div>

      {showUploadForm && (
        <div className="space-y-4 border rounded-lg p-4">
          <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Input placeholder="Video Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <select
            className="w-full p-2 rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.filter((cat) => !["trending", "recent", "mine"].includes(cat.id)).map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Submit"}
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="trending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          {categories.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="flex items-center gap-1 text-xs">
              <c.icon className="h-3 w-3" /> {c.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id}>
            {loading ? <p>Loading...</p> : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredVideos
                  .filter((video) => {
                    if (cat.id === "mine") return video.uploaded_by === user?.id;
                    if (cat.id === "trending") return true;
                    if (cat.id === "recent") return true;
                    return video.category === cat.id;
                  })
                  .sort((a, b) => {
                    if (cat.id === "trending") return (b.views_count ?? 0) - (a.views_count ?? 0);
                    if (cat.id === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    return 0;
                  })
                  .map((video) => (
                    <Card key={video.id} className="group cursor-pointer transition-all hover:shadow-lg">
                      <div className="relative" onPlay={() => recordView(video.id)}>
  {video.video_url && video.canAccess ? (
<video
  id={`video-${video.id}`}
  controls={video.canAccess}      // Disable controls if user can't access
  preload="metadata"
  className={`w-full h-48 rounded-t-lg bg-black ${!video.canAccess ? "pointer-events-none opacity-50" : ""}`} // Gray out blocked video
>
  {video.canAccess && <source src={video.video_url} type="video/mp4" />}
  {!video.canAccess && (
    <div className="w-full h-full flex items-center justify-center text-white text-center">
      {video.isBlocked ? "This video has been blocked." : "Upgrade to Premium to watch this video."}
    </div>
  )}
  Your browser does not support the video tag.
</video>

) : video.video_url && !video.canAccess ? (
  <div className="w-full h-48 rounded-t-lg bg-black flex items-center justify-center text-white text-center p-2">
    {video.isBlocked
      ? "This video has been blocked."
      : "Upgrade to Premium to watch this video."}
  </div>
) : (
  <img
    src={video.thumbnail_url || "/placeholder.svg"}
    alt={video.title}
    className="w-full h-48 object-cover rounded-t-lg"
  />
)}



                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center pointer-events-none">
                          <Button
                            size="lg"
                            className="rounded-full w-16 h-16 pointer-events-auto"
                            onClick={(e) => {
  e.stopPropagation();

  // Do nothing if user cannot access the video
  if (!video.canAccess) {
  const message = video.isBlocked 
    ? "This video has been blocked." 
    : "Upgrade to Premium to watch this video.";
    
  alert(message);
  
  // Redirect free users to subscription page
  if (!video.isBlocked) {
    navigate("/subscription");
  }
  return;
}


  const vid = document.getElementById(`video-${video.id}`) as HTMLVideoElement;
  if (!vid) return;

  if (vid.paused) {
    vid.play();
    setPlayingVideoId(video.id);
  } else {
    vid.pause();
    setPlayingVideoId(null);
  }
}}

                          >
                            {playingVideoId === video.id ? (
                              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                              </svg>
                            ) : (
                              <Play className="h-6 w-6" />
                            )}
                          </Button>
                        </div>

                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                          {video.duration || "00:00"}
                        </Badge>
                      </div>

                      <CardHeader className="pb-2">
                        <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={"/placeholder.svg"} />
                            <AvatarFallback>👤</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{video.uploader}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <Clock className="h-3 w-3" /> {formatDate(video.created_at)}
                        </div>

                        <CardDescription className="line-clamp-2 mb-2">
                          {video.description}
                        </CardDescription>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {video.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> {formatViews(video.views_count)}
                          <Heart
  className="h-4 w-4 ml-3 cursor-pointer"
  fill={video.liked_by_me ? "red" : "none"}
  stroke={video.liked_by_me ? "red" : "currentColor"}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleLikeToggle(video.id);
  }}
/>


                            {video.likes_count}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
