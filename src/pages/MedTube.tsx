"use client";
import { GlobalLoader } from "@/components/GlobalLoader";

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
  Play, Eye, Heart, Clock, Search, Trash2, Upload, TrendingUp, Calendar,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useSession } from "@supabase/auth-helpers-react";
export function MedTube() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [videos, setVideos] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      // Load cached videos first
      const cached = localStorage.getItem("cachedVideos");
      if (cached) return JSON.parse(cached);
    }
    return [];
  });

  const [loading, setLoading] = useState(true);
  const session = useSession();        // ✅ Get the current session
  const user = session?.user || null;  // ✅ Get the logged-in user
  const [subscription, setSubscription] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState("trending");
  const [activeTab, setActiveTab] = useState("trending");

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [overlayVideo, setOverlayVideo] = useState<{ id: string; url: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>("00:00");
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);

  // Track progress in localStorage
  useEffect(() => {
    const savedProgress = JSON.parse(localStorage.getItem("videoProgress") || "{}");
    Object.entries(savedProgress).forEach(([id, time]) => {
      const vid = videoRefs.current[id];
      if (vid) {
        vid.currentTime = Number(time);
      }
    });
  }, []);

  const saveProgress = (videoId: string, time: number) => {
    const progress = JSON.parse(localStorage.getItem("videoProgress") || "{}");
    progress[videoId] = time;
    localStorage.setItem("videoProgress", JSON.stringify(progress));
  };

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
    if (!user) return;

    const fetchSubscription = async () => {
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      setSubscription(subData || null);
    };

    fetchSubscription();
  }, [user]);

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
        // If subscription exists, nothing is blocked
        const isBlocked = subscription ? false : (video.block === 'true' || video.is_visible === false);
        const isPremium = video.is_premium === true;
        const isFreeVideo = video.is_free === true;

        // Access rules
        const canAccess = subscription ? true : !isBlocked && isFreeVideo;

        // inside fetchVideos
        const [likesRes, viewsRes, uploaderRes] = await Promise.all([
          video.id
            ? supabase
              .from("medtube_video_likes")
              .select("user_id")
              .eq("video_id", video.id)
            : { data: [], error: null },

          video.id
            ? supabase
              .from("medtube_video_views")
              .select("id")
              .eq("video_id", video.id)
            : { data: [], error: null },

          video.uploaded_by
            ? supabase
              .from("profiles")
              .select("username, name, avatar_url")
              .eq("user_id", video.uploaded_by)
              .maybeSingle()
            : { data: { username: "Unknown", name: "Unknown", avatar_url: null }, error: null }
        ]);

        return {
          ...video,
          likes_count: likesRes.data?.length ?? 0,
          views_count: viewsRes.data?.length ?? 0,
          uploader: uploaderRes.data?.username || uploaderRes.data?.name || "Unknown",
          uploader_avatar: uploaderRes.data?.avatar_url || null,
          liked_by_me: likesRes.data?.some((like) => like.user_id === user?.id),
          isBlocked,
          canAccess,
        };

      })
    );
    localStorage.setItem("cachedVideos", JSON.stringify(enrichedVideos));

    setVideos(enrichedVideos);
    setLoading(false);
  };

  useEffect(() => {
    if (user !== undefined) {
      fetchVideos();
    }
  }, [user, subscription]);
  // 🔴 Realtime subscription for MedTube (videos, likes, views, subscriptions)
  useEffect(() => {
    const channel = supabase.channel("medtube_realtime");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medtube_videos" },
        () => {
          console.log("Realtime: videos changed, refreshing...");
          fetchVideos();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medtube_video_likes" },
        (payload) => {
          console.log("Realtime: like event", payload);
          const { eventType, new: newRow, old: oldRow } = payload;

          setVideos((prev) =>
            prev.map((v) => {
              if (v.id !== (newRow?.video_id || oldRow?.video_id)) return v;

              if (eventType === "INSERT") {
                return {
                  ...v,
                  likes_count: v.likes_count + 1,
                  liked_by_me: newRow.user_id === user?.id ? true : v.liked_by_me,
                };
              }
              if (eventType === "DELETE") {
                return {
                  ...v,
                  likes_count: v.likes_count - 1,
                  liked_by_me: oldRow.user_id === user?.id ? false : v.liked_by_me,
                };
              }
              return v;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medtube_video_views" },
        (payload) => {
          const newView = payload.new;
          if (!newView) return;

          setVideos((prev) =>
            prev.map((v) =>
              v.id === newView.video_id
                ? { ...v, views_count: (v.views_count ?? 0) + 1 }
                : v
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        async () => {
          console.log("Realtime: subscription changed, refreshing user subscription...");

          if (!user) return; // skip if no session

          const { data: subData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

          setSubscription(subData || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // add user as dependency



  const recordView = async (videoId: string, updateUI = true) => {
    if (!user || !videoId) return;

    try {
      const { error } = await supabase
        .from("medtube_video_views")
        .upsert({ video_id: videoId, user_id: user.id }, { onConflict: ["video_id", "user_id"] });

      if (!error && updateUI) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId ? { ...v, views_count: v.views_count + 1 } : v
          )
        );
      }
    } catch (err) {
      console.error("Error tracking view:", err);
    } finally {
      // hide spinner after recording view
      setLoadingVideoId(null);
    }
  };
  const handleDeleteVideo = async (video: any) => {
    if (!user || user.id !== video.uploaded_by) {
      alert("You can only delete your own videos.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return;
    }

    try {
      // 1. Delete from bucket
      const filename = video.video_url.split("/").pop();
      if (filename) {
        const { error: storageError } = await supabase.storage
          .from("videos")
          .remove([filename]);

        if (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from("medtube_videos")
        .delete()
        .eq("id", video.id);

      if (dbError) {
        console.error("DB delete error:", dbError);
        alert("Error deleting video from database.");
        return;
      }

      // 3. Remove from UI state
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      alert("Video deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting the video.");
    }
  };

  const handleLikeToggle = async (videoId: string) => {
    if (!user) return alert("Login to like");

    // check if already liked
    const { data: existingLike } = await supabase
      .from("medtube_video_likes")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .single();

    let liked = false;

    if (existingLike) {
      await supabase
        .from("medtube_video_likes")
        .delete()
        .eq("id", existingLike.id);
      liked = false;
    } else {
      await supabase
        .from("medtube_video_likes")
        .insert({ video_id: videoId, user_id: user.id });
      liked = true;
    }

    // Update local state **based on actual result**
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
            ...v,
            liked_by_me: liked,
            likes_count: liked ? v.likes_count + 1 : v.likes_count - 1,
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
    if (files.length === 0 || !title || !user || !category) {
      return alert("Login and fill in all fields");
    }

    setUploading(true);

    try {
      for (const file of files) {
        setUploadProgress(0);

        const filename = `${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;

        // 1️⃣ Get signed upload URL
        const { data: signedUrl, error: signedError } =
          await supabase.storage
            .from("videos")
            .createSignedUploadUrl(filename);

        if (signedError || !signedUrl) {
          throw signedError;
        }

        // 2️⃣ Upload video with progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          uploadXhrRef.current = xhr;

          xhr.open("PUT", signedUrl.signedUrl, true);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            xhr.status === 200 ? resolve() : reject(new Error("Upload failed"));
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.send(file);
        });

        // 3️⃣ Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("videos")
          .getPublicUrl(filename);

        // 4️⃣ Insert DB record (ONE PER VIDEO)
        const { error: insertError } = await supabase
          .from("medtube_videos")
          .insert({
            title,
            description,
            video_url: publicUrlData.publicUrl,
            uploaded_by: user.id,
            tags: tags.split(",").map((t) => t.trim()),
            duration,
            is_visible: true,
            category,
          });

        if (insertError) {
          throw insertError;
        }
      }

      alert("All videos uploaded successfully");

      // Reset form
      setTitle("");
      setDescription("");
      setTags("");
      setCategory("");
      setFiles([]);
      setPreviewUrl(null);
      setDuration("00:00");
      setShowUploadForm(false);

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    if (files.length > 0) {
      const firstFile = files[0];
      const url = URL.createObjectURL(firstFile);
      setPreviewUrl(url);

      const video = document.createElement("video");
      video.src = url;
      video.onloadedmetadata = () => {
        const mins = Math.floor(video.duration / 60).toString().padStart(2, "0");
        const secs = Math.floor(video.duration % 60).toString().padStart(2, "0");
        setDuration(`${mins}:${secs}`);
      };
    }
  }, [files]);

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-2 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8  ">

      <div className="flex items-center justify-between">
        <div className="w-full">

          {/* Title + Badge Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
              MedTube
            </h1>

            {subscription && (
              <Badge className="bg-green-600 text-white w-fit">
                {subscription.plan_type.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground mt-1">
            Explore a rich library of educational videos designed specifically for nursing and medical students. Learn essential clinical skills, master pharmacology concepts, understand complex medical conditions, and stay prepared for emergencies. Our platform empowers you to grow confidently, practice with real-world scenarios, and advance your knowledge at your own pace. Dive in, stay curious, and let MedTube guide your journey to becoming a skilled healthcare professional!
          </p>

        </div>
      </div>

      {showUploadForm && (
        <div className="space-y-4 border rounded-lg p-4">
          <Input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files ?? []);
              setFiles(selectedFiles);

              if (selectedFiles.length > 0) {
                const firstFile = selectedFiles[0];

                // Prefill title: file name without extension
                const nameWithoutExt = firstFile.name.replace(/\.[^/.]+$/, "");
                setTitle(nameWithoutExt);

                // Prefill description: file type
                setDescription(`Video type: ${firstFile.type || "unknown"}`);

                // Optionally prefill category based on file type or leave empty
                // setCategory("clinical"); // example default
              }
            }}

          />
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium">Selected videos:</p>

              <ul className="text-sm text-gray-700 dark:text-gray-300">
                {files.map((file, index) => (
                  <li key={index} className="flex justify-between">
                    <span className="truncate">{file.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
          {uploading && (
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm("Are you sure you want to cancel this upload?")) {
                  if (uploadXhrRef.current) {
                    uploadXhrRef.current.abort(); //  cancel the request
                    setUploading(false);
                    setUploadProgress(0);
                    alert("Upload cancelled");
                  }
                }
              }}
            >
              Cancel Upload
            </Button>
          )}
          {uploading && (
            <div className="w-full mt-2 space-y-2">
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Percentage + MB display */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>{uploadProgress}%</span>
                {files.length > 0 && (
                  <span>
                    {((files[0].size * uploadProgress) / 100 / (1024 * 1024)).toFixed(2)} MB /{" "}
                    {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>
          )}


        </div>
      )}

      <div className="relative flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          className="flex items-center gap-2 lg:w-auto w-full"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          <Upload className="h-4 w-4" /> Upload Video
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-1">

        {/* Mobile dropdown */}
        <div className="md:hidden">
          <select
            className="w-full p-2 rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setActiveTab(e.target.value)}
            value={activeTab}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

        </div>

        {/* Desktop tabs (remain unchanged) */}
        <div className="hidden md:block">
          <TabsList className="grid w-full grid-cols-7">
            {categories.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="flex items-center gap-1 text-xs">
                <c.icon className="h-3 w-3" /> {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {categories.map((cat) => (
          <TabsContent
            key={cat.id}
            value={cat.id}
          >

            {videos.length === 0 && loading ? (
              <GlobalLoader message="Medrae is loading videos..." />
            ) : (
              <div className="grid gap-2  md:grid-cols-2 lg:grid-cols-3">

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
                    <Card key={video.id} className="group cursor-pointer transition-all hover:shadow-lg border-0">
                      <div className="relative" onPlay={() => recordView(video.id)}>
                        {video.video_url ? (
                          video.canAccess ? (
                            <div className="relative w-full h-48">
                              <video
                                ref={(el) => (videoRefs.current[video.id] = el)}
                                id={`video-${video.id}`}
                                controls
                                preload="none"
                                poster={video.thumbnail_url || "/placeholder.svg"}
                                className="w-full h-48 rounded-t-lg bg-black"
                                onPlay={() => {
                                  const vid = videoRefs.current[video.id];
                                  if (!vid) return;

                                  // Only set src if not already set
                                  if (!vid.src || vid.src === "") {
                                    vid.src = video.video_url;
                                    vid.play();
                                    return; // exit to wait for video to load
                                  }

                                  // Show loading spinner while the video is buffering
                                  setLoadingVideoId(video.id);

                                  // Record view WITHOUT triggering full fetch
                                  recordView(video.id, false); // we'll adjust recordView to optionally skip updating videos state
                                }}
                                onLoadedData={() => {
                                  setLoadingVideoId(null);
                                  const vid = videoRefs.current[video.id];
                                  if (vid) {
                                    const savedProgress = JSON.parse(localStorage.getItem("videoProgress") || "{}");
                                    if (savedProgress[video.id]) {
                                      vid.currentTime = savedProgress[video.id];
                                    }
                                  }
                                }}
                                onTimeUpdate={(e) => {
                                  const vid = e.currentTarget;
                                  saveProgress(video.id, vid.currentTime);
                                }}
                              />

                              {/* Spinner overlay */}
                              {loadingVideoId === video.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>



                          ) : (
                            <div className="w-full h-48 rounded-t-lg bg-black flex items-center justify-center text-white text-center p-2">
                              {video.isBlocked
                                ? "This video has been blocked."
                                : "Upgrade to Premium to watch this video."}
                            </div>
                          )
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
                                if (!video.isBlocked) {
                                  navigate("/subscription"); // redirect free users to subscription page
                                }
                                return;
                              }

                              // Open overlay modal with this video
                              setOverlayVideo({ id: video.id, url: video.video_url });

                              // Pause all other videos (optional, keeps logic consistent)
                              Object.entries(videoRefs.current).forEach(([id, v]) => {
                                if (id !== video.id && v && !v.paused) {
                                  v.pause();
                                }
                              });

                              // Record the view for analytics
                              recordView(video.id, false);
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
                        {subscription && (
                          <Badge className="bg-green-600 text-white ml-2">
                            UNLOCKED
                          </Badge>
                        )}
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={video.uploader_avatar || "/placeholder.svg"}
                              className="object-cover"
                            />
                            <AvatarFallback className="flex items-center justify-center text-xs">
                              {video.uploader?.[0]?.toUpperCase() || "👤"}
                            </AvatarFallback>
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

                          {/*  Delete button visible only for owner */}
                          {user?.id === video.uploaded_by && (
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteVideo(video);
                              }}
                              variant="ghost"
                              className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                          )}
                        </div>

                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      {overlayVideo && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setOverlayVideo(null)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={overlayVideo.url}
              autoPlay
              controls
              className="w-full h-full rounded-md object-contain bg-black"
            />

            {/* Small watermark with text below */}
            <div className="absolute bottom-16 right-4 flex flex-col items-center pointer-events-none">
              <img
                src="/pwa-192x192.jpeg"
                alt="App Icon"
                className="w-6 h-6 opacity-60"
              />
              <span className="text-white text-xs opacity-60 mt-1">Medrae</span>
            </div>
          </div>

          <Button
            onClick={() => setOverlayVideo(null)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 text-white"
          >
            ✕
          </Button>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-lg flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
              Uploading {files.length} video{files.length > 1 ? "s" : ""}...
            </h2>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {/* Percentage + MB display */}
            {files.length > 0 && (
              <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 w-full mb-4">
                <span>{uploadProgress}%</span>
                <span>
                  {((files[0].size * uploadProgress) / 100 / (1024 * 1024)).toFixed(2)} MB /{" "}
                  {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}

            {/* Optional Cancel button */}
            <button
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              onClick={() => {
                if (window.confirm("Cancel upload?")) {
                  if (uploadXhrRef.current) uploadXhrRef.current.abort();
                  setUploading(false);
                  setUploadProgress(0);
                  alert("Upload cancelled");
                }
              }}
            >
              Cancel Upload
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
