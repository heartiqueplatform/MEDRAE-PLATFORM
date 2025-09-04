"use client";  

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  Share,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  BarChart3,
} from "lucide-react";

export function Reels() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [likedReels, setLikedReels] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastReelRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<number | null>(null);

  const [newReel, setNewReel] = useState({
    title: "",
    description: "",
    file: null as File | null,
  });

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchReels = async (pageNumber = 0) => {
    if (pageNumber === 0) setLoading(true);
    await fetchUser();

    const { data: reelData, error } = await supabase
      .from("reels")
      .select(`
        id,
        title,
        description,
        reel_url,
        thumbnail_url,
        tags,
        course,
        block,
        unit,
        uploaded_by,
        profiles (name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .range(pageNumber * 5, pageNumber * 5 + 4);

    if (error || !reelData) {
      console.error("Error fetching reels:", error);
      setLoading(false);
      return;
    }

    const reelIds = reelData.map((r) => r.id);

    const { data: likesData } = await supabase
      .from("reel_likes")
      .select("reel_id, user_id")
      .in("reel_id", reelIds);

    const { data: viewsData } = await supabase
      .from("reel_views")
      .select("reel_id")
      .in("reel_id", reelIds);

    const updated = reelData.map((reel) => {
      const likeCount = likesData?.filter((l) => l.reel_id === reel.id).length || 0;
      const hasLiked = likesData?.some(
        (l) => l.reel_id === reel.id && l.user_id === userId
      );
      const viewCount = viewsData?.filter((v) => v.reel_id === reel.id).length || 0;

      return { ...reel, likeCount, viewCount, hasLiked };
    });

    setReels((prev) => [...prev, ...updated]);
    setLikedReels((prev) => [
      ...new Set([...prev, ...updated.filter((r) => r.hasLiked).map((r) => r.id)]),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchReels(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 1 }
    );
    if (lastReelRef.current) observer.current.observe(lastReelRef.current);
  }, [reels]);

  useEffect(() => {
  const options = {
    threshold: 0.75,
  };

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    let maxRatio = 0;
    let mostVisibleIndex: number | null = null;

    entries.forEach((entry, index) => {
      if (entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio;
        mostVisibleIndex = videoRefs.current.indexOf(entry.target as HTMLVideoElement);
      }
    });

    videoRefs.current.forEach((video, index) => {
      if (index === mostVisibleIndex) {
        video?.play().catch(() => {});
        setCurrentPlaying(index);
        if (userId && reels[index]) recordView(reels[index].id);
      } else {
        video?.pause();
      }
    });
  };

  const observer = new IntersectionObserver(handleIntersection, options);
  videoRefs.current.forEach((video) => {
    if (video) observer.observe(video);
  });

  return () => {
    observer.disconnect();
  };
}, [reels, userId]);

  const recordView = async (reelId: string) => {
    if (!userId) return;
    await supabase.from("reel_views").insert({
      reel_id: reelId,
      user_id: userId,
    });
  };

  const toggleLike = async (reelId: string) => {
    if (!userId) return;
    const hasLiked = likedReels.includes(reelId);

    if (hasLiked) {
      await supabase
        .from("reel_likes")
        .delete()
        .eq("reel_id", reelId)
        .eq("user_id", userId);
      setLikedReels((prev) => prev.filter((id) => id !== reelId));
    } else {
      await supabase.from("reel_likes").insert({
        reel_id: reelId,
        user_id: userId,
      });
      setLikedReels((prev) => [...prev, reelId]);
    }

    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? {
              ...r,
              likeCount: r.likeCount + (hasLiked ? -1 : 1),
              hasLiked: !hasLiked,
            }
          : r
      )
    );
  };

  const handleUpload = async () => {
    if (!newReel.file || !newReel.title || !userId) return;
    setUploading(true);

    const filename = `${Date.now()}-${newReel.file.name}`;
    const { data: fileData, error: fileError } = await supabase.storage
      .from("reels")
      .upload(filename, newReel.file);

    if (fileError) {
      console.error("Upload error:", fileError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("reels")
      .getPublicUrl(filename);

    const reelData = {
      title: newReel.title,
      description: newReel.description,
      reel_url: publicUrl?.publicUrl,
      uploaded_by: userId,
    };

    await supabase.from("reels").insert(reelData);
    setNewReel({ title: "", description: "", file: null });
    setShowUpload(false);
    setReels([]);
    setPage(0);
    await fetchReels(0);
    setUploading(false);
  };

  const shareToWhatsApp = (reelUrl: string) => {
    const message = `Check out this medical reel: ${reelUrl}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const formatCount = (count: number) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
            Medical Reels
          </h1>
          <p className="text-muted-foreground mt-2">
            Short educational videos for quick learning
          </p>
        </div>
        <Button
  onClick={() => alert("Coming Soon: This page is under development Upload feature and the entire page  will be available in future!")}
  className="flex items-center gap-2"
>
  <Upload className="h-4 w-4" />
  Upload
</Button>

      </div>

      {showUpload && (
        <Card className="p-4 space-y-4">
          <Input
            placeholder="Title"
            value={newReel.title}
            onChange={(e) =>
              setNewReel({ ...newReel, title: e.target.value })
            }
          />
          <Input
            placeholder="Description"
            value={newReel.description}
            onChange={(e) =>
              setNewReel({ ...newReel, description: e.target.value })
            }
          />
          <Input
            type="file"
            accept="video/*"
            onChange={(e) =>
              setNewReel({ ...newReel, file: e.target.files?.[0] || null })
            }
          />
          <Button disabled={uploading} onClick={handleUpload}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "Uploading..." : "Submit Reel"}
          </Button>
        </Card>
      )}
<div className="snap-y snap-mandatory overflow-y-auto h-screen lg:h-[95vh] max-w-md mx-auto">

  {reels.map((reel, i) => (
   <Card
  key={reel.id}
  className="snap-start h-[90vh] lg:h-[85vh] relative bg-black overflow-hidden"
  ref={i === reels.length - 1 ? lastReelRef : null}
>

           <div className="h-full relative flex flex-col">
  {/* Tap-to-toggle wrapper */}
<div
  className="flex-1 relative"
  onClick={() => {
    const video = videoRefs.current[i];
    if (!video) return;

    if (video.paused) {
      video.play();
      setCurrentPlaying(i);
    } else {
      video.pause();
      setCurrentPlaying(null);
    }
  }}
>
  <video
    ref={(el) => el && (videoRefs.current[i] = el)}
    src={reel.reel_url}
    muted={isMuted}
    controls={false}
    className="object-cover w-full h-full"
    playsInline
    onTimeUpdate={(e) => {
      const progress =
        (e.currentTarget.currentTime / e.currentTarget.duration) * 100;

      const progressBar = document.getElementById(`progress-${reel.id}`);
      const tracker = document.getElementById(`tracker-${reel.id}`);

      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }

      if (tracker) {
        tracker.style.left = `${progress}%`;
      }
    }}
    onEnded={() => {
      const video = videoRefs.current[i];
      if (video) {
        video.currentTime = 0;
        video.play();
      }
    }}
  />
</div>


 {/* Progress Bar - now above the info section */}
{/* Full-width container */}
<div
  className="absolute bottom-16 left-0 h-1 w-full bg-white/20 z-50 cursor-pointer group"
  onClick={(e) => {
    const video = videoRefs.current[i];
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    video.currentTime = percent * video.duration;
  }}
>
  {/* Progress fill */}
  <div
    id={`progress-${reel.id}`}
    className="h-full bg-white transition-all duration-100 linear"
    style={{ width: "0%" }}
  />

  {/* Tracker dot - now positioned relative to this full container */}
  <div
    id={`tracker-${reel.id}`}
    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md"
    style={{ left: "0%" }}
  />
</div>

  {/* Play/Pause + Volume */}
  <div className="absolute top-4 right-4 space-y-2 z-10">
    <Button
      size="sm"
      variant="ghost"
      className="text-white bg-black/30 hover:bg-black/50"
      onClick={() => {
        const video = videoRefs.current[i];
        if (!video) return;
        if (video.paused) {
          video.play();
          setCurrentPlaying(i);
        } else {
          video.pause();
          setCurrentPlaying(null);
        }
      }}
    >
      {currentPlaying === i ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </Button>
    <Button
      size="sm"
      variant="ghost"
      className="text-white bg-black/30 hover:bg-black/50"
      onClick={() => setIsMuted((m) => !m)}
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  </div>

  {/* Like & Share Buttons */}
  <div className="absolute bottom-20 right-4 space-y-4 z-10">
    <div className="text-center">
      <Button
        size="sm"
        variant="ghost"
        className={`text-white p-2 rounded-full ${
          likedReels.includes(reel.id)
            ? "bg-red-500 hover:bg-red-600"
            : "bg-black/30 hover:bg-black/50"
        }`}
        onClick={() => toggleLike(reel.id)}
      >
        <Heart
          className={`h-5 w-5 ${
            likedReels.includes(reel.id) ? "fill-current" : ""
          }`}
        />
      </Button>
      <p className="text-white text-xs mt-1">{formatCount(reel.likeCount)} </p>
      <p className="text-white text-xs mt-1 flex items-center justify-center gap-1">
        <BarChart3 className="h-3 w-3" /> {formatCount(reel.viewCount)}
      </p>
    </div>

    <div className="text-center">
      <Button
        size="sm"
        variant="ghost"
        className="text-white bg-black/30 hover:bg-black/50 p-2 rounded-full"
        onClick={() => shareToWhatsApp(reel.reel_url)}
      >
        <Share className="h-5 w-5" />
      </Button>
      <p className="text-white text-xs mt-1">WhatsApp</p>
    </div>
  </div>

  {/* Avatar, Name, Title, Description */}
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white z-10">
    <div className="flex items-center gap-2 mb-2">
 <Avatar className="h-8 w-8">
  <AvatarImage
    src={reel.profiles?.avatar_url || "/placeholder.svg"}
    className="object-cover"
  />
  <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-xs">
    {reel.profiles?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
  </AvatarFallback>
</Avatar>

      <span className="font-medium text-sm">
        {reel.profiles?.name || "Unknown"}
      </span>
    </div>
    <h3 className="font-semibold mb-1">{reel.title}</h3>
    <p className="text-sm opacity-90 line-clamp-2">{reel.description}</p>
  </div>
</div>

          </Card>
        ))}
       
        {reels.length === 0 && !loading && (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
    <h2 className="text-3xl font-bold text-gray-800">
      Welcome to Medical Reels
    </h2>
    <p className="text-gray-700 max-w-xl text-lg leading-relaxed">
      This page will serve as a hub for short, high-quality educational videos designed to help medical students, professionals, and enthusiasts enhance their knowledge quickly and effectively.  
      In the near future, you will be able to explore videos covering essential medical concepts, practical skills, quick learning techniques, and real-world clinical insights.  
      Each video will aim to provide concise, actionable, and easy-to-understand content that can be consumed in just a few minutes, making learning efficient, engaging, and accessible from anywhere.  
      Stay tuned as we will continue to expand the library, offering a wide variety of topics to support your medical journey and professional growth.
    </p>
  </div>
)}

      </div>
    </div>
  );
}
