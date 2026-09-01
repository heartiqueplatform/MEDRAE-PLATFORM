"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Play, Eye, Heart, Clock, Search, Trash2, Upload, TrendingUp, Calendar, MessageCircle, Star, Send, RefreshCw, Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useSession } from "@supabase/auth-helpers-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInView } from 'react-intersection-observer';

// Skeleton Components
function VideoCardSkeleton() {
  return (
    <div className="animate-pulse">
      <Card className="border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-sm dark:bg-muted/30">
        <div className="relative w-full aspect-video md:h-48 bg-gray-200 dark:bg-gray-700 rounded-none md:rounded-t-lg" />
        <CardHeader className="pb-1 md:pb-2 px-4 md:px-6 pt-3 md:pt-4">
          <div className="h-4 md:h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 md:h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pt-0 pb-3 md:pb-4">
          <div className="h-3 md:h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1 md:mb-2" />
          <div className="space-y-1 mb-2 md:mb-4">
            <div className="h-3 md:h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 md:h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex gap-0.5 md:gap-1 mb-3 md:mb-4">
            <div className="h-4 md:h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 md:h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 md:h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="h-3 w-3 md:h-4 md:w-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-3 md:h-4 md:w-4 bg-gray-200 dark:bg-gray-700 rounded ml-1 md:ml-3" />
              <div className="h-3 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50 mx-4" />
    </div>
  );
}

function MedTubeSkeleton() {
  return (
    <div className="space-y-0 md:space-y-4 max-w-8xl mx-auto px-0 md:px-4 py-0 md:py-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div>
            <div className="h-7 md:h-9 w-32 md:w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 md:h-4 w-64 md:w-96 bg-gray-200 dark:bg-gray-700 rounded mt-0.5 md:mt-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 md:h-9 w-28 md:w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 md:h-9 w-32 md:w-36 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>

      {/* Search Skeleton */}
      <div className="relative flex flex-col md:flex-row gap-2 md:gap-3 px-4 md:px-0">
        <div className="relative flex-1">
          <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl" />
        </div>
        <div className="h-10 md:h-11 w-full md:w-32 bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-1">
        <div className="hidden md:block px-0">
          <div className="grid w-full grid-cols-8 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-9 md:h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
        <div className="md:hidden px-4">
          <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>

        <div className="px-0 md:px-0">
          <div className="grid gap-0 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to extract YouTube video ID
const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.+v=([^&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

const extractVimeoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

const isDirectVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i;
  return videoExtensions.test(url);
};

const parseVideoSource = (input: string) => {
  if (!input || input.trim() === '') {
    return { embed_type: 'other', embed_id: null, embed_url: null };
  }
  const trimmed = input.trim();
  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) {
    return { embed_type: 'youtube', embed_id: youtubeId, embed_url: `https://www.youtube.com/embed/${youtubeId}` };
  }
  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return { embed_type: 'vimeo', embed_id: vimeoId, embed_url: `https://player.vimeo.com/video/${vimeoId}` };
  }
  if (isDirectVideoUrl(trimmed)) {
    return { embed_type: 'direct', embed_id: null, embed_url: trimmed };
  }
  return { embed_type: 'other', embed_id: null, embed_url: trimmed };
};

// Video Player Component
const VideoPlayer = ({ video, autoPlay = false, onPlay, className = "" }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (video.embed_type === 'direct' && videoRef.current && autoPlay) {
      videoRef.current.play().catch(e => console.log('Auto-play prevented:', e));
    }
  }, [autoPlay, video.embed_type]);

  if (video.embed_type === 'youtube' && video.embed_id) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${video.embed_id}${autoPlay ? '?autoplay=1' : ''}`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  if (video.embed_type === 'vimeo' && video.embed_id) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <iframe
          className="w-full h-full"
          src={`https://player.vimeo.com/video/${video.embed_id}${autoPlay ? '?autoplay=1' : ''}`}
          title={video.title}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  if (video.embed_type === 'direct' && video.embed_url) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          controls
          autoPlay={autoPlay}
          onLoadedData={() => setIsLoading(false)}
          onPlay={onPlay}
        >
          <source src={video.embed_url} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-black flex items-center justify-center text-white text-center p-4 ${className}`}>
      <div>
        <p className="mb-2">Video preview not available</p>
        {video.embed_url && (
          <a href={video.embed_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-sm">
            Open video in new tab
          </a>
        )}
      </div>
    </div>
  );
};

// Comments Modal Component
const CommentsModal = ({ videoId, isOpen, onClose }: { videoId: string; isOpen: boolean; onClose: () => void }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(5);
  const [commentType, setCommentType] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const session = useSession();
  const user = session?.user || null;

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("user_comments")
      .select(`
        *,
        profiles:user_id (username, name, avatar_url)
      `)
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    if (data) setComments(data);
  }, [videoId]);

  useEffect(() => {
    if (isOpen && videoId) {
      fetchComments();
    }
  }, [isOpen, videoId, fetchComments]);

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_comments")
        .insert({
          user_id: user.id,
          video_id: videoId,
          comment_text: newComment,
          comment_type: commentType,
          rating: rating,
        });

      if (!error) {
        setNewComment("");
        fetchComments();
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] rounded-xl overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Feedback & Comments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className={`text-2xl ${r <= rating ? "text-yellow-500" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <Select value={commentType} onValueChange={setCommentType}>
                <SelectTrigger className="ml-auto w-[180px] h-9">
                  <SelectValue placeholder="Feedback Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="video_feedback">Video Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Share your thoughts, report issues, or suggest improvements..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />

            <Button onClick={submitComment} disabled={submitting || !newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </Button>
          </div>

          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>
                        {comment.profiles?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {comment.profiles?.username || "Anonymous"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {comment.comment_type}
                    </Badge>
                    {comment.rating && (
                      <div className="flex text-yellow-500 text-xs">
                        {"★".repeat(comment.rating)}{"☆".repeat(5 - comment.rating)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{comment.comment_text}</p>
                {comment.admin_response && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <strong>Admin Response:</strong> {comment.admin_response}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Cache management
interface VideoCache {
  data: any[];
  totalCount: number;
  timestamp: number;
  userId: string;
  activeTab: string;
  watchedIds: string[];
}

class VideoCacheManager {
  private static instance: VideoCacheManager;
  private cache: Map<string, VideoCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance() {
    if (!VideoCacheManager.instance) {
      VideoCacheManager.instance = new VideoCacheManager();
    }
    return VideoCacheManager.instance;
  }

  getCacheKey(userId: string, activeTab: string, watchedIds: string[]): string {
    const sortedWatched = [...watchedIds].sort().join(',');
    return `${userId}-${activeTab}-${sortedWatched}`;
  }

  get(userId: string, activeTab: string, watchedIds: string[]): VideoCache | null {
    const key = this.getCacheKey(userId, activeTab, watchedIds);
    const cached = this.cache.get(key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(userId: string, activeTab: string, watchedIds: string[], data: any[], totalCount: number) {
    const key = this.getCacheKey(userId, activeTab, watchedIds);
    this.cache.set(key, {
      data,
      totalCount,
      timestamp: Date.now(),
      userId,
      activeTab,
      watchedIds,
    });
  }

  clear() {
    this.cache.clear();
  }

  clearForUser(userId: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((value, key) => {
      if (value.userId === userId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

const cacheManager = VideoCacheManager.getInstance();

const PAGE_SIZE = 20;

export function MedTube() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const session = useSession();
  const user = session?.user || null;
  const [activeTab, setActiveTab] = useState("trending");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [overlayVideo, setOverlayVideo] = useState<any>(null);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  const likingRef = useRef(new Set<string>());
  const viewingRef = useRef(new Set<string>());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlError, setUrlError] = useState("");

  const categories = [
    { id: "trending", name: "Trending", icon: TrendingUp },
    { id: "recent", name: "Recent", icon: Calendar },
    { id: "emergency", name: "Emergency Medicine", icon: Play },
    { id: "pharmacology", name: "Pharmacology", icon: Play },
    { id: "clinical", name: "Clinical Skills", icon: Play },
    { id: "conditions", name: "Medical Conditions", icon: Play },
    { id: "mine", name: "My Uploads", icon: Upload },
  ];

  const getSortOrder = useCallback(() => {
    if (activeTab === "trending") {
      return { column: 'views_count', ascending: false };
    }
    return { column: 'created_at', ascending: false };
  }, [activeTab]);

  const getCategoryFilter = useCallback(() => {
    if (activeTab === "mine") return null;
    if (activeTab === "trending" || activeTab === "recent" || activeTab === "all") return null;
    return activeTab;
  }, [activeTab]);

  const loadVideos = useCallback(async (pageNum: number, reset: boolean = false, forceRefresh: boolean = false) => {
    if (!user) return;
    if (loadingMore && !reset) return;
    if (!reset && !hasMore) return;

    if (reset && !forceRefresh) {
      const watchedArray = Array.from(watchedIds);
      const cached = cacheManager.get(user.id, activeTab, watchedArray);

      if (cached && cached.data.length > 0) {
        console.log('📦 Loading from cache:', cached.data.length, 'videos');
        setVideos(cached.data);
        setTotalCount(cached.totalCount);
        setHasMore(cached.data.length >= PAGE_SIZE);
        setPage(1);
        setLoading(false);
        setIsCacheLoaded(true);

        setVideos(prev => prev.map(v => ({
          ...v,
          is_watched: watchedIds.has(v.id),
        })));
        return;
      }
    }

    if (reset) {
      setLoading(true);
      setPage(0);
      setVideos([]);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const sortOrder = getSortOrder();
      const categoryFilter = getCategoryFilter();

      if (reset) {
        let countQuery = supabase
          .from("medtube_videos")
          .select("id", { count: 'exact', head: true })
          .eq("is_visible", true);

        if (categoryFilter) {
          countQuery = countQuery.eq("category", categoryFilter);
        }

        if (activeTab === "mine" && user) {
          countQuery = countQuery.eq("uploaded_by", user.id);
        }

        const { count, error: countError } = await countQuery;
        if (!countError && count !== null) {
          setTotalCount(count);
        }
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("medtube_videos")
        .select(`
          *,
          medtube_video_likes!left (user_id),
          medtube_video_views!left (id)
        `)
        .eq("is_visible", true)
        .range(from, to)
        .order(sortOrder.column, { ascending: sortOrder.ascending });

      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      if (activeTab === "mine" && user) {
        query = query.eq("uploaded_by", user.id);
      }

      if (activeTab === "all" && watchedIds.size > 0) {
        const watchedArray = Array.from(watchedIds);
        if (watchedArray.length > 0) {
          query = query.not("id", "in", `(${watchedArray.join(",")})`);
        }
      }

      const { data: videosData, error } = await query;
      if (error) throw error;

      const newHasMore = videosData.length === PAGE_SIZE;
      setHasMore(newHasMore);

      if (videosData.length === 0 && reset) {
        setVideos([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const uploaderIds = [...new Set(videosData.map(v => v.uploaded_by).filter(Boolean))];

      let profilesMap = new Map();
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, name, avatar_url")
          .in("user_id", uploaderIds);
        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.user_id, p]));
        }
      }

      const enrichedVideos = videosData.map((video) => {
        const profile = profilesMap.get(video.uploaded_by);
        return {
          ...video,
          likes_count: video.medtube_video_likes?.length || 0,
          views_count: video.medtube_video_views?.length || 0,
          uploader: profile?.username || profile?.name || "Unknown",
          uploader_avatar: profile?.avatar_url || null,
          liked_by_me: video.medtube_video_likes?.some((like: any) => like.user_id === user?.id) || false,
          is_watched: watchedIds.has(video.id),
        };
      });

      if (reset) {
        setVideos(enrichedVideos);
        setPage(pageNum + 1);

        const watchedArray = Array.from(watchedIds);
        cacheManager.set(user.id, activeTab, watchedArray, enrichedVideos, totalCount);
        console.log('💾 Cached videos:', enrichedVideos.length, 'videos');
      } else {
        const existingIds = new Set(videos.map(v => v.id));
        const newVideos = enrichedVideos.filter(v => !existingIds.has(v.id));
        const updatedVideos = [...videos, ...newVideos];
        setVideos(updatedVideos);
        setPage(pageNum + 1);

        const watchedArray = Array.from(watchedIds);
        cacheManager.set(user.id, activeTab, watchedArray, updatedVideos, totalCount);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, activeTab, watchedIds, getSortOrder, getCategoryFilter, videos, totalCount]);

  useEffect(() => {
    if (inView && !loading && !loadingMore && hasMore && videos.length > 0) {
      loadVideos(page, false);
    }
  }, [inView, loading, loadingMore, hasMore, page, loadVideos, videos.length]);

  const triggerVideoSync = useCallback(async () => {
    if (!user) {
      alert("Please log in to sync videos.");
      return;
    }

    setSyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-youtube-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync videos');
      }

      const data = await response.json();

      if (data.success) {
        alert(`Sync completed! Inserted ${data.inserted} new videos, skipped ${data.skipped} existing videos.`);
        cacheManager.clearForUser(user.id);
        await loadVideos(0, true, true);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Error syncing videos:', error);
      alert(`Failed to sync videos: ${error.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  }, [user, loadVideos]);

  const resetWatchHistory = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("user_video_watch_history")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setWatchedIds(new Set());
      cacheManager.clearForUser(user.id);
      await loadVideos(0, true, true);
      setShowResetConfirm(false);
      alert("Watch history reset! You'll now see all videos again.");
    }
  }, [user, loadVideos]);

  const markVideoAsWatched = useCallback(async (videoId: string) => {
    if (!user) return;

    setWatchedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(videoId);
      return newSet;
    });

    if (activeTab === "all") {
      setVideos(prev => prev.filter(v => v.id !== videoId));
      const watchedArray = Array.from(watchedIds);
      watchedArray.push(videoId);
      cacheManager.clearForUser(user.id);
    }

    try {
      await supabase
        .from("user_video_watch_history")
        .upsert({
          user_id: user.id,
          video_id: videoId,
          watched_at: new Date().toISOString(),
          completed: true,
        }, { onConflict: "user_id, video_id" });
    } catch (err) {
      console.error("Error marking video as watched:", err);
      await loadVideos(0, true, true);
    }
  }, [user, activeTab, watchedIds, loadVideos]);

  const recordView = useCallback(async (videoId: string) => {
    if (!user || !videoId) return;

    if (viewingRef.current.has(videoId)) return;
    viewingRef.current.add(videoId);

    try {
      const { data: existingView } = await supabase
        .from("medtube_video_views")
        .select("id")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .single();

      if (!existingView) {
        setVideos(prev =>
          prev.map(v =>
            v.id === videoId
              ? { ...v, views_count: (v.views_count || 0) + 1 }
              : v
          )
        );

        const { error } = await supabase
          .from("medtube_video_views")
          .upsert(
            { video_id: videoId, user_id: user.id },
            { onConflict: "video_id, user_id", ignoreDuplicates: true }
          );

        if (error) {
          console.error("Error tracking view:", error);
          setVideos(prev =>
            prev.map(v =>
              v.id === videoId
                ? { ...v, views_count: (v.views_count || 0) - 1 }
                : v
            )
          );
        }
      }
    } catch (err) {
      console.error("Error in recordView:", err);
    } finally {
      viewingRef.current.delete(videoId);
    }
  }, [user]);

  const handleLikeToggle = useCallback(async (videoId: string) => {
    if (!user) {
      alert("Login to like");
      return;
    }

    if (likingRef.current.has(videoId)) return;
    likingRef.current.add(videoId);

    const video = videos.find(v => v.id === videoId);
    if (!video) {
      likingRef.current.delete(videoId);
      return;
    }

    const wasLiked = video.liked_by_me;
    const oldLikesCount = video.likes_count;

    setVideos(prev =>
      prev.map(v =>
        v.id === videoId
          ? {
            ...v,
            liked_by_me: !wasLiked,
            likes_count: wasLiked ? v.likes_count - 1 : v.likes_count + 1,
          }
          : v
      )
    );

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("medtube_video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medtube_video_likes")
          .upsert(
            { video_id: videoId, user_id: user.id },
            { onConflict: "video_id, user_id", ignoreDuplicates: true }
          );

        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      setVideos(prev =>
        prev.map(v =>
          v.id === videoId
            ? {
              ...v,
              liked_by_me: wasLiked,
              likes_count: oldLikesCount,
            }
            : v
        )
      );
      alert("Failed to update like. Please try again.");
    } finally {
      likingRef.current.delete(videoId);
    }
  }, [user, videos]);

  const handleDeleteVideo = useCallback(async (video: any) => {
    if (!user || user.id !== video.uploaded_by) {
      alert("You can only delete your own videos.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) return;

    try {
      const { error: dbError } = await supabase
        .from("medtube_videos")
        .delete()
        .eq("id", video.id);
      if (dbError) throw dbError;

      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      cacheManager.clearForUser(user.id);
      alert("Video deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting the video.");
    }
  }, [user]);

  const handleUpload = useCallback(async () => {
    if (!videoUrl || !title || !user || !category) {
      return alert("Please fill in all fields and provide a video URL");
    }

    const parsed = parseVideoSource(videoUrl);
    if (!parsed.embed_url) {
      setUrlError("Invalid video URL. Please enter a valid YouTube, Vimeo, or direct video link.");
      return;
    }
    setUrlError("");

    setUploading(true);

    try {
      const insertData: any = {
        title: title || "Untitled Video",
        description: description || null,
        uploaded_by: user.id,
        tags: tags.split(",").map((t) => t.trim()).filter(t => t),
        duration: "00:00",
        is_visible: true,
        category: category,
        embed_type: parsed.embed_type,
        embed_id: parsed.embed_id,
        embed_url: parsed.embed_url,
        video_url: videoUrl,
      };

      const { error: insertError } = await supabase
        .from("medtube_videos")
        .insert(insertData);

      if (insertError) throw insertError;

      alert("Video added successfully!");
      setTitle("");
      setDescription("");
      setTags("");
      setCategory("");
      setVideoUrl("");
      setShowUploadForm(false);
      cacheManager.clearForUser(user.id);
      await loadVideos(0, true, true);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Failed to add video: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }, [videoUrl, title, user, category, description, tags, loadVideos]);

  const formatViews = useCallback((views: number) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
    return views?.toString() ?? "0";
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks ago`;
    return `${Math.ceil(days / 30)} months ago`;
  }, []);

  const filteredVideos = useMemo(() => {
    let filtered = videos;

    if (searchTerm.trim()) {
      filtered = filtered.filter((video) =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [videos, searchTerm]);

  useEffect(() => {
    if (user) {
      loadVideos(0, true);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      const fetchWatchHistory = async () => {
        const { data: watchHistory } = await supabase
          .from("user_video_watch_history")
          .select("video_id")
          .eq("user_id", user.id);
        const currentWatchedIds = new Set(watchHistory?.map(w => w.video_id) || []);
        setWatchedIds(currentWatchedIds);
      };
      fetchWatchHistory();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to MedTube</h2>
        </div>
      </div>
    );
  }

  // Show skeleton while loading and no videos
  if (loading && videos.length === 0) {
    return <MedTubeSkeleton />;
  }

  return (
    <div className="space-y-0 md:space-y-4 max-w-8xl mx-auto px-0 md:px-4 py-0 md:py-4">
      {/* Header - Mobile Native */}
      <div className="px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">MedTube</h1>
            <p className="text-sm text-muted-foreground mt-0.5 md:mt-1">
              Explore a rich library of educational videos designed specifically for nursing and medical students.
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-medium">
                  ({totalCount} total videos {isCacheLoaded && '📦 cached'})
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={triggerVideoSync} disabled={syncing} className="gap-2 text-xs md:text-sm">
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync YouTube
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="gap-2 text-xs md:text-sm">
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />
              Reset Watch History
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Form - Mobile Native */}
      {showUploadForm && (
        <div className="space-y-3 md:space-y-4 border-0 md:border rounded-none md:rounded-lg p-4 md:p-4 mx-4 md:mx-0 dark:bg-muted/30">
          <div>
            <Input
              placeholder="Video URL (YouTube, Vimeo, or direct MP4 link)"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (urlError) setUrlError("");
              }}
              className="rounded-lg md:rounded-xl"
            />
            {urlError && <p className="text-red-500 text-xs md:text-sm mt-1">{urlError}</p>}
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Supported: YouTube, Vimeo, direct video links (.mp4, .webm, etc.)
            </p>
          </div>
          <Input placeholder="Video Title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg md:rounded-xl" />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg md:rounded-xl" />
          <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-lg md:rounded-xl" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full rounded-lg md:rounded-xl">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter((cat) => !["trending", "recent", "mine"].includes(cat.id)).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleUpload} disabled={uploading} className="w-full md:w-auto">
            {uploading ? "Adding Video..." : "Add Video"}
          </Button>
        </div>
      )}

      {/* Search and Actions - Mobile Native */}
      <div className="relative flex flex-col md:flex-row gap-2 md:gap-3 px-4 md:px-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-lg md:rounded-xl"
          />
        </div>
        <Button className="flex items-center gap-2 w-full md:w-auto rounded-lg md:rounded-xl" onClick={() => setShowUploadForm(!showUploadForm)}>
          <Upload className="h-4 w-4" /> Add Video
        </Button>
      </div>

      {/* Tabs - Mobile Native */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-1">
        <div className="md:hidden px-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Videos</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:block px-0">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="all" className="flex items-center gap-1 text-xs">All Videos</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="flex items-center gap-1 text-xs">
                <c.icon className="h-3 w-3" /> {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="px-0 md:px-0">
          {loading && videos.length === 0 ? (
            <MedTubeSkeleton />
          ) : filteredVideos.length === 0 && !loading ? (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground mb-4">
                {activeTab === "all"
                  ? "You've watched all videos! Click 'Reset Watch History' to see them again."
                  : `No videos found in ${categories.find(c => c.id === activeTab)?.name || activeTab}`}
              </p>
              {activeTab === "all" && (
                <Button onClick={() => setShowResetConfirm(true)} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Watch History
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-0 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredVideos.map((video, index) => (
                  <div key={video.id}>
                    <Card className="group cursor-pointer transition-all hover:md:shadow-lg border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-sm dark:bg-muted/30">
                      <div className="relative">
                        <div className="relative w-full aspect-video md:h-48">
                          <VideoPlayer
                            video={video}
                            className="rounded-none md:rounded-t-lg"
                            onPlay={() => {
                              recordView(video.id);
                              if (activeTab === "all" && !video.is_watched) {
                                markVideoAsWatched(video.id);
                              }
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-none md:rounded-t-lg flex items-center justify-center pointer-events-none">
                          <Button
                            size="lg"
                            className="rounded-full w-14 h-14 md:w-16 md:h-16 pointer-events-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverlayVideo(video);
                              recordView(video.id);
                            }}
                          >
                            <Play className="h-5 w-5 md:h-6 md:w-6" />
                          </Button>
                        </div>
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] md:text-xs">{video.duration || "00:00"}</Badge>
                        <Badge className="absolute top-2 left-2 bg-black/70 text-white text-[8px] md:text-xs">
                          {video.embed_type === 'youtube' ? 'YouTube' : video.embed_type === 'vimeo' ? 'Vimeo' : video.embed_type === 'direct' ? 'Direct' : 'Video'}
                        </Badge>
                        {video.is_watched && activeTab === "all" && (
                          <Badge className="absolute top-2 right-2 bg-green-600 text-white text-[8px] md:text-xs">Watched ✓</Badge>
                        )}
                      </div>

                      <CardHeader className="pb-1 md:pb-2 px-4 md:px-6 pt-3 md:pt-4">
                        <CardTitle className="text-sm md:text-base line-clamp-2 group-hover:md:text-primary transition-colors">{video.title}</CardTitle>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Avatar className="h-5 w-5 md:h-6 md:w-6">
                            <AvatarImage src={video.uploader_avatar || "/placeholder.svg"} className="object-cover" />
                            <AvatarFallback className="flex items-center justify-center text-[8px] md:text-xs">
                              {video.uploader?.[0]?.toUpperCase() || "👤"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] md:text-sm text-muted-foreground truncate">{video.uploader}</span>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 md:px-6 pt-0 pb-3 md:pb-4">
                        <div className="flex items-center gap-1 text-[10px] md:text-sm text-muted-foreground mb-1 md:mb-2">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" /> {formatDate(video.created_at)}
                        </div>
                        <CardDescription className="line-clamp-2 text-xs md:text-sm mb-2 md:mb-4">{video.description}</CardDescription>
                        <div className="flex flex-wrap gap-0.5 md:gap-1 mb-3 md:mb-4">
                          {video.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[8px] md:text-xs">{tag}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <Eye className="h-3 w-3 md:h-4 md:w-4" /> {formatViews(video.views_count)}
                            <Heart
                              className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-3 cursor-pointer transition-transform active:scale-90"
                              fill={video.liked_by_me ? "red" : "none"}
                              stroke={video.liked_by_me ? "red" : "currentColor"}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleLikeToggle(video.id);
                              }}
                            />
                            {video.likes_count}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedVideoForComments(video.id);
                              }}
                              className="ml-1 md:ml-2 p-0.5 md:p-1 hover:bg-muted rounded-full transition"
                            >
                              <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                            </button>
                          </div>
                          {user?.id === video.uploaded_by && (
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteVideo(video);
                              }}
                              variant="ghost"
                              className="p-1 md:p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-700 active:scale-95 transition h-auto"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {/* Mobile Separator */}
                    {index < filteredVideos.length - 1 && (
                      <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50 mx-4" />
                    )}
                  </div>
                ))}
              </div>

              {/* Load more trigger */}
              {hasMore && filteredVideos.length > 0 && (
                <div ref={loadMoreRef} className="flex justify-center py-6 md:py-8">
                  {loadingMore ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
                      <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                      Loading more videos...
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => loadVideos(page, false)}
                      className="gap-2 text-xs md:text-sm"
                    >
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4" />
                      Load More
                    </Button>
                  )}
                </div>
              )}

              {!hasMore && videos.length > 0 && (
                <div className="text-center py-4 text-muted-foreground text-xs md:text-sm">
                  You've reached the end of the list 🎉
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Overlay - z-index updated to z-[9999] */}
      {overlayVideo && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center p-2 md:p-4" onClick={() => setOverlayVideo(null)}>
          <div className="relative w-full max-w-5xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <VideoPlayer video={overlayVideo} autoPlay={true} className="rounded-md" />
            <div className="absolute bottom-16 right-4 flex flex-col items-center pointer-events-none">
              <img src="/pwa-192x192.jpeg" alt="App Icon" className="w-5 h-5 md:w-6 md:h-6 opacity-60" />
              <span className="text-white text-[10px] md:text-xs opacity-60 mt-1">Medrae</span>
            </div>
          </div>
          <Button onClick={() => setOverlayVideo(null)} className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 rounded-full hover:bg-white/20 text-white">✕</Button>
        </div>
      )}

      {/* Reset Confirm Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Reset Watch History?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">This will reset your watch history and all videos will reappear in your feed. Your likes and comments will not be affected.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
              <Button onClick={resetWatchHistory}>Reset History</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      {selectedVideoForComments && (
        <CommentsModal videoId={selectedVideoForComments} isOpen={!!selectedVideoForComments} onClose={() => setSelectedVideoForComments(null)} />
      )}
    </div>
  );
}