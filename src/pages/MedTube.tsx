"use client";
import {
  useEffect, useState, useRef, useCallback, useMemo, memo
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play, Eye, Heart, Clock, Search, Trash2, Upload, TrendingUp, Calendar,
  MessageCircle, Star, Send, RefreshCw, Loader2, ChevronLeft, Menu, X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useSession } from "@supabase/auth-helpers-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInView } from 'react-intersection-observer';

// ═══════════════════════════════════════════════════════════════
// GRID CONSTANT
// ═══════════════════════════════════════════════════════════════
const VIDEO_GRID_CLASS =
  "grid gap-4 md:gap-4 lg:gap-5 " +
  "grid-cols-1 " +
  "sm:grid-cols-2 " +
  "md:grid-cols-3 " +
  "lg:grid-cols-3 " +
  "xl:grid-cols-3";
// ═══════════════════════════════════════════════════════════════
// SKELETONS
// ═══════════════════════════════════════════════════════════════
function VideoCardSkeleton() {
  return (
    <div className="animate-pulse">
      <Card className="border-0 rounded-xl shadow-none bg-gh-l-card dark:bg-gh-card">
        <div className="relative w-full aspect-video bg-gh-l-hover dark:bg-gh-hover rounded-t-xl" />
        <CardHeader className="pb-1.5 px-3 pt-2.5">
          <div className="h-4 w-3/4 bg-gh-l-hover dark:bg-gh-hover rounded mb-2" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
            <div className="h-3 w-20 bg-gh-l-hover dark:bg-gh-hover rounded" />
          </div>
        </CardHeader>
        <CardContent className="px-3 pt-0 pb-3">
          <div className="h-3 w-20 bg-gh-l-hover dark:bg-gh-hover rounded mb-2" />
          <div className="space-y-1 mb-3">
            <div className="h-3 w-full bg-gh-l-hover dark:bg-gh-hover rounded" />
            <div className="h-3 w-3/4 bg-gh-l-hover dark:bg-gh-hover rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MedTubeSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col bg-gh-l-canvas dark:bg-gh-canvas animate-pulse">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 md:px-5 py-2.5 md:py-3 border-b border-gh-l-border dark:border-gh-border">
        <div className="h-8 w-8 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="h-3.5 w-20 rounded bg-gh-l-hover dark:bg-gh-hover" />
          <div className="h-2 w-16 rounded bg-gh-l-hover dark:bg-gh-hover" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-8 w-8 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
          <div className="h-8 w-8 rounded-full bg-gh-l-hover dark:bg-gh-hover" />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="hidden xl:block w-56 shrink-0 border-r border-gh-l-border dark:border-gh-border p-3 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-gh-l-hover dark:bg-gh-hover" />
          ))}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="w-full px-3 md:px-5 lg:px-6 py-3 md:py-5 space-y-4">
            <div className="h-10 rounded-xl bg-gh-l-hover dark:bg-gh-hover" />
            <div className={VIDEO_GRID_CLASS}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
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
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url);
};
const parseVideoSource = (input: string) => {
  if (!input || input.trim() === '') return { embed_type: 'other', embed_id: null, embed_url: null };
  const trimmed = input.trim();
  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) return { embed_type: 'youtube', embed_id: youtubeId, embed_url: `https://www.youtube.com/embed/${youtubeId}` };
  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) return { embed_type: 'vimeo', embed_id: vimeoId, embed_url: `https://player.vimeo.com/video/${vimeoId}` };
  if (isDirectVideoUrl(trimmed)) return { embed_type: 'direct', embed_id: null, embed_url: trimmed };
  return { embed_type: 'other', embed_id: null, embed_url: trimmed };
};

// ═══════════════════════════════════════════════════════════════
// VIDEO PLAYER
// ═══════════════════════════════════════════════════════════════
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
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${video.embed_id}${autoPlay ? '?autoplay=1' : ''}`}
          title={video.title} frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }
  if (video.embed_type === 'vimeo' && video.embed_id) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          className="w-full h-full"
          src={`https://player.vimeo.com/video/${video.embed_id}${autoPlay ? '?autoplay=1' : ''}`}
          title={video.title} frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }
  if (video.embed_type === 'direct' && video.embed_url) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <video
          ref={videoRef} className="w-full h-full object-contain bg-black"
          controls autoPlay={autoPlay}
          onLoadedData={() => setIsLoading(false)} onPlay={onPlay}
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

// ═══════════════════════════════════════════════════════════════
// COMMENTS PANEL — inline under the player, no modal
// ═══════════════════════════════════════════════════════════════
function CommentsPanel({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(5);
  const [commentType, setCommentType] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const session = useSession();
  const user = session?.user || null;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_comments")
      .select(`*, profiles:user_id (username, name, avatar_url)`)
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });
    if (data) setComments(data);
    setLoading(false);
  }, [videoId]);

  useEffect(() => { if (videoId) fetchComments(); }, [videoId, fetchComments]);

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_comments").insert({
        user_id: user.id, video_id: videoId,
        comment_text: newComment, comment_type: commentType, rating,
      });
      if (!error) { setNewComment(""); fetchComments(); }
    } catch (err) { console.error("Error submitting comment:", err); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mt-5">
      <h2 className="text-sm font-bold text-gh-l-text dark:text-gh-text mb-3">
        {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
      </h2>

      {/* Composer */}
      {user ? (
        <div className="mb-5 p-3 rounded-xl bg-gh-l-card dark:bg-gh-card border border-gh-l-border dark:border-gh-border">
          <div className="flex items-start gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs">
                {(user.email?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2">
              <Textarea
                placeholder="Add a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="border-0 bg-gh-l-hover/70 dark:bg-gh-hover/70 rounded-lg text-sm resize-none"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRating(r)}
                        className={`text-base leading-none transition-colors ${r <= rating ? "text-yellow-500" : "text-gh-l-muted dark:text-gh-muted"
                          }`}
                      >★</button>
                    ))}
                  </div>
                  <Select value={commentType} onValueChange={setCommentType}>
                    <SelectTrigger className="h-8 w-[150px] text-xs border-0 bg-gh-l-hover/60 dark:bg-gh-hover/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="video_feedback">Video Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm" onClick={submitComment}
                  disabled={submitting || !newComment.trim()}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Send className="h-3 w-3" />
                  {submitting ? "Posting…" : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gh-l-muted dark:text-gh-muted mb-5">
          Sign in to join the conversation.
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gh-l-muted dark:text-gh-muted py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gh-l-muted dark:text-gh-muted py-4">
          No comments yet. Be the first.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {comment.profiles?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gh-l-text dark:text-gh-text">
                    {comment.profiles?.username || "Anonymous"}
                  </span>
                  <span className="text-[10px] text-gh-l-muted dark:text-gh-muted">
                    · {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                  {comment.comment_type && comment.comment_type !== "general" && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                      {comment.comment_type}
                    </Badge>
                  )}
                  {comment.rating && (
                    <span className="text-[10px] text-yellow-500">
                      {"★".repeat(comment.rating)}{"☆".repeat(5 - comment.rating)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gh-l-text/90 dark:text-gh-text/90 mt-1 leading-relaxed whitespace-pre-wrap">
                  {comment.comment_text}
                </p>
                {comment.admin_response && (
                  <div className="mt-2 p-2 rounded-md bg-gh-l-hover/60 dark:bg-gh-hover/60 border-l-2 border-blue-500">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">
                      Medrae Team
                    </p>
                    <p className="text-xs text-gh-l-text/90 dark:text-gh-text/90">{comment.admin_response}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════
interface VideoCache {
  data: any[]; totalCount: number; timestamp: number;
  userId: string; activeTab: string; watchedIds: string[];
}
class VideoCacheManager {
  private static instance: VideoCacheManager;
  private cache: Map<string, VideoCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  static getInstance() {
    if (!VideoCacheManager.instance) VideoCacheManager.instance = new VideoCacheManager();
    return VideoCacheManager.instance;
  }
  getCacheKey(userId: string, activeTab: string, watchedIds: string[]): string {
    return `${userId}-${activeTab}-${[...watchedIds].sort().join(',')}`;
  }
  get(userId: string, activeTab: string, watchedIds: string[]): VideoCache | null {
    const key = this.getCacheKey(userId, activeTab, watchedIds);
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) { this.cache.delete(key); return null; }
    return cached;
  }
  set(userId: string, activeTab: string, watchedIds: string[], data: any[], totalCount: number) {
    this.cache.set(this.getCacheKey(userId, activeTab, watchedIds), {
      data, totalCount, timestamp: Date.now(), userId, activeTab, watchedIds,
    });
  }
  clearForUser(userId: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((value, key) => { if (value.userId === userId) keysToDelete.push(key); });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}
const cacheManager = VideoCacheManager.getInstance();
const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// WATCH PAGE — player + inline comments + Up next rail
// ═══════════════════════════════════════════════════════════════
function WatchPage({
  video, relatedVideos, onSelectVideo, onLike,
  formatViews, formatDate,
  loadMoreRef, loadingMore, hasMore, onLoadMore,
}: {
  video: any;
  relatedVideos: any[];
  onSelectVideo: (v: any) => void;
  onLike: (id: string) => void;
  formatViews: (n: string | number) => string;
  formatDate: (s: string) => string;
  loadMoreRef?: React.Ref<HTMLDivElement>;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-gh-l-canvas dark:bg-gh-canvas">
      <div className="w-full px-3 md:px-5 lg:px-6 py-3 md:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-6">

          {/* ─── Left: player + meta + comments ─── */}
          <div className="min-w-0">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
              <VideoPlayer video={video} autoPlay={true} />
            </div>

            <h1 className="mt-3 text-base md:text-lg font-bold text-gh-l-text dark:text-gh-text leading-snug line-clamp-2">
              {video.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gh-l-muted dark:text-gh-muted">
              <span>{formatViews(video.views_count)} views</span>
              <span aria-hidden>·</span>
              <span>{formatDate(video.created_at)}</span>
              {video.tags?.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{video.tags.slice(0, 3).join(", ")}</span>
                </>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-gh-l-border dark:border-gh-border">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={video.uploader_avatar || "/placeholder.svg"} className="object-cover" />
                  <AvatarFallback className="text-xs">
                    {video.uploader?.[0]?.toUpperCase() || "👤"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gh-l-text dark:text-gh-text truncate">
                    {video.uploader}
                  </p>
                  <p className="text-[10px] text-gh-l-muted dark:text-gh-muted">Uploader</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={video.liked_by_me ? "default" : "outline"}
                  size="sm" onClick={() => onLike(video.id)}
                  className="h-9 gap-1.5 text-xs"
                >
                  <Heart className="h-3.5 w-3.5" fill={video.liked_by_me ? "currentColor" : "none"} />
                  {video.liked_by_me ? "Liked" : "Like"}
                  {video.likes_count > 0 && <span className="tabular-nums">{video.likes_count}</span>}
                </Button>
              </div>
            </div>

            {video.description && (
              <div className="mt-3 p-3 rounded-xl bg-gh-l-card/70 dark:bg-gh-card/70 border border-gh-l-border dark:border-gh-border">
                <p className="text-xs text-gh-l-text/85 dark:text-gh-text/85 whitespace-pre-wrap leading-relaxed">
                  {video.description}
                </p>
              </div>
            )}

            {/* 💬 Inline comments — no modal */}
            <CommentsPanel videoId={video.id} />
          </div>

          {/* ─── Right: Up next ─── */}
          <aside className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <h2 className="text-xs   uppercase tracking-widest text-gh-l-muted dark:text-gh-muted mb-2">
              Up next
            </h2>
            {relatedVideos.length === 0 ? (
              <p className="text-xs text-gh-l-muted dark:text-gh-muted py-4">No related videos.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {relatedVideos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onSelectVideo(v)}
                      className="w-full flex gap-2.5 p-1.5 rounded-lg hover:bg-gh-l-hover dark:hover:bg-gh-hover transition-colors text-left"
                    >
                      <div className="relative shrink-0 w-32 md:w-36 aspect-video rounded-md overflow-hidden bg-gh-l-hover dark:bg-gh-hover">
                        <VideoPlayer video={v} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gh-l-text dark:text-gh-text leading-snug line-clamp-2">
                          {v.title}
                        </p>
                        <p className="text-[10px] text-gh-l-muted dark:text-gh-muted mt-0.5 truncate">
                          {v.uploader}
                        </p>
                        <p className="text-[10px] text-gh-l-muted dark:text-gh-muted truncate">
                          {formatViews(v.views_count)} views · {formatDate(v.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-gh-l-muted dark:text-gh-muted text-xs">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                      </div>
                    ) : onLoadMore ? (
                      <Button variant="outline" onClick={onLoadMore}
                        className="text-xs border-0 bg-gh-l-hover/60 dark:bg-gh-hover/60">
                        Load more
                      </Button>
                    ) : null}
                  </div>
                )}
                {!hasMore && (
                  <p className="text-[10px] text-gh-l-muted dark:text-gh-muted text-center py-4">
                    That's all for now.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
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

  // Tracks whether the auth session has finished hydrating at least once.
  // Without this, `user` is null on first paint even for logged-in users,
  // which flashes (or sticks) the welcome screen.
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    // `useSession()` returns undefined while hydrating, then either a
    // Session or null. Once we've seen anything other than undefined,
    // we can trust the value.
    if (session !== undefined) setAuthReady(true);
  }, [session]);

  const [activeTab, setActiveTab] = useState("trending");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [watchingVideo, setWatchingVideo] = useState<any>(null);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1, rootMargin: '100px' });
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
  const allTabs = [{ id: "all", name: "All Videos", icon: Play }, ...categories];

  const getSortOrder = useCallback(() => {
    if (activeTab === "trending") return { column: 'views_count', ascending: false };
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
        setVideos(cached.data);
        setTotalCount(cached.totalCount);
        setHasMore(cached.data.length >= PAGE_SIZE);
        setPage(1);
        setLoading(false);
        setVideos(prev => prev.map(v => ({ ...v, is_watched: watchedIds.has(v.id) })));
        return;
      }
    }

    if (reset) { setLoading(true); setPage(0); setVideos([]); setHasMore(true); }
    else { setLoadingMore(true); }

    try {
      const sortOrder = getSortOrder();
      const categoryFilter = getCategoryFilter();

      if (reset) {
        let countQuery = supabase.from("medtube_videos").select("id", { count: 'exact', head: true }).eq("is_visible", true);
        if (categoryFilter) countQuery = countQuery.eq("category", categoryFilter);
        if (activeTab === "mine" && user) countQuery = countQuery.eq("uploaded_by", user.id);
        const { count, error: countError } = await countQuery;
        if (!countError && count !== null) setTotalCount(count);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("medtube_videos")
        .select(`*, medtube_video_likes!left (user_id), medtube_video_views!left (id)`)
        .eq("is_visible", true)
        .range(from, to)
        .order(sortOrder.column, { ascending: sortOrder.ascending });

      if (categoryFilter) query = query.eq("category", categoryFilter);
      if (activeTab === "mine" && user) query = query.eq("uploaded_by", user.id);
      if (activeTab === "all" && watchedIds.size > 0) {
        const watchedArray = Array.from(watchedIds);
        if (watchedArray.length > 0) query = query.not("id", "in", `(${watchedArray.join(",")})`);
      }

      const { data: videosData, error } = await query;
      if (error) throw error;

      setHasMore(videosData.length === PAGE_SIZE);
      if (videosData.length === 0 && reset) {
        setVideos([]); setLoading(false); setLoadingMore(false); return;
      }

      const uploaderIds = [...new Set(videosData.map(v => v.uploaded_by).filter(Boolean))];
      let profilesMap = new Map();
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, username, name, avatar_url").in("user_id", uploaderIds);
        if (profiles) profilesMap = new Map(profiles.map(p => [p.user_id, p]));
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
        cacheManager.set(user.id, activeTab, Array.from(watchedIds), enrichedVideos, totalCount);
      } else {
        const existingIds = new Set(videos.map(v => v.id));
        const newVideos = enrichedVideos.filter(v => !existingIds.has(v.id));
        const updatedVideos = [...videos, ...newVideos];
        setVideos(updatedVideos);
        setPage(pageNum + 1);
        cacheManager.set(user.id, activeTab, Array.from(watchedIds), updatedVideos, totalCount);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, activeTab, watchedIds, getSortOrder, getCategoryFilter, videos, totalCount, loadingMore, hasMore]);

  useEffect(() => {
    if (inView && !loading && !loadingMore && hasMore && videos.length > 0) {
      loadVideos(page, false);
    }
  }, [inView, loading, loadingMore, hasMore, page, loadVideos, videos.length]);

  const triggerVideoSync = useCallback(async () => {
    if (!user) { alert("Please log in to sync videos."); return; }
    setSyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-youtube-videos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      } else { throw new Error(data.error || 'Sync failed'); }
    } catch (error: any) {
      console.error('Error syncing videos:', error);
      alert(`Failed to sync videos: ${error.message || 'Unknown error'}`);
    } finally { setSyncing(false); }
  }, [user, loadVideos]);

  const resetWatchHistory = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from("user_video_watch_history").delete().eq("user_id", user.id);
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
    setWatchedIds(prev => { const newSet = new Set(prev); newSet.add(videoId); return newSet; });
    if (activeTab === "all") {
      setVideos(prev => prev.filter(v => v.id !== videoId));
      cacheManager.clearForUser(user.id);
    }
    try {
      await supabase.from("user_video_watch_history").upsert({
        user_id: user.id, video_id: videoId,
        watched_at: new Date().toISOString(), completed: true,
      }, { onConflict: "user_id, video_id" });
    } catch (err) {
      console.error("Error marking video as watched:", err);
      await loadVideos(0, true, true);
    }
  }, [user, activeTab, loadVideos]);

  const recordView = useCallback(async (videoId: string) => {
    if (!user || !videoId) return;
    if (viewingRef.current.has(videoId)) return;
    viewingRef.current.add(videoId);
    try {
      const { data: existingView } = await supabase
        .from("medtube_video_views").select("id")
        .eq("video_id", videoId).eq("user_id", user.id).single();
      if (!existingView) {
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, views_count: (v.views_count || 0) + 1 } : v));
        const { error } = await supabase
          .from("medtube_video_views")
          .upsert({ video_id: videoId, user_id: user.id }, { onConflict: "video_id, user_id", ignoreDuplicates: true });
        if (error) {
          setVideos(prev => prev.map(v => v.id === videoId ? { ...v, views_count: (v.views_count || 0) - 1 } : v));
        }
      }
    } catch (err) { console.error("Error in recordView:", err); }
    finally { viewingRef.current.delete(videoId); }
  }, [user]);

  const handleLikeToggle = useCallback(async (videoId: string) => {
    if (!user) { alert("Login to like"); return; }
    if (likingRef.current.has(videoId)) return;
    likingRef.current.add(videoId);
    const video = videos.find(v => v.id === videoId);
    if (!video) { likingRef.current.delete(videoId); return; }
    const wasLiked = video.liked_by_me;
    const oldLikesCount = video.likes_count;
    setVideos(prev => prev.map(v => v.id === videoId ? {
      ...v, liked_by_me: !wasLiked,
      likes_count: wasLiked ? v.likes_count - 1 : v.likes_count + 1,
    } : v));
    try {
      if (wasLiked) {
        const { error } = await supabase.from("medtube_video_likes").delete().eq("video_id", videoId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medtube_video_likes").upsert(
          { video_id: videoId, user_id: user.id },
          { onConflict: "video_id, user_id", ignoreDuplicates: true }
        );
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      setVideos(prev => prev.map(v => v.id === videoId ? {
        ...v, liked_by_me: wasLiked, likes_count: oldLikesCount,
      } : v));
      alert("Failed to update like. Please try again.");
    } finally { likingRef.current.delete(videoId); }
  }, [user, videos]);

  const handleDeleteVideo = useCallback(async (video: any) => {
    if (!user || user.id !== video.uploaded_by) { alert("You can only delete your own videos."); return; }
    if (!window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) return;
    try {
      const { error: dbError } = await supabase.from("medtube_videos").delete().eq("id", video.id);
      if (dbError) throw dbError;
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      cacheManager.clearForUser(user.id);
      alert("Video deleted successfully.");
    } catch (err) { console.error("Delete error:", err); alert("An error occurred while deleting the video."); }
  }, [user]);

  const handleUpload = useCallback(async () => {
    if (!videoUrl || !title || !user || !category) return alert("Please fill in all fields and provide a video URL");
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
        duration: "00:00", is_visible: true, category,
        embed_type: parsed.embed_type, embed_id: parsed.embed_id,
        embed_url: parsed.embed_url, video_url: videoUrl,
      };
      const { error: insertError } = await supabase.from("medtube_videos").insert(insertData);
      if (insertError) throw insertError;
      alert("Video added successfully!");
      setTitle(""); setDescription(""); setTags(""); setCategory(""); setVideoUrl("");
      setShowUploadForm(false);
      cacheManager.clearForUser(user.id);
      await loadVideos(0, true, true);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Failed to add video: ${err.message || "Unknown error"}`);
    } finally { setUploading(false); }
  }, [videoUrl, title, user, category, description, tags, loadVideos]);

  const formatViews = useCallback((views: number) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
    return views?.toString() ?? "0";
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 1) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks ago`;
    return `${Math.ceil(days / 30)} months ago`;
  }, []);

  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) return videos;
    return videos.filter((video) =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [videos, searchTerm]);

  useEffect(() => { if (user) loadVideos(0, true); }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      (async () => {
        const { data: watchHistory } = await supabase
          .from("user_video_watch_history").select("video_id").eq("user_id", user.id);
        setWatchedIds(new Set(watchHistory?.map(w => w.video_id) || []));
      })();
    }
  }, [user]);

  const handleSelectCategory = (id: string) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gh-l-canvas dark:bg-gh-canvas px-6">
        <div className="flex flex-col items-center justify-center text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 flex items-center justify-center mb-5">
            <Play className="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="currentColor" />
          </div>
          <h2 className="text-2xl   tracking-tight text-gh-l-text dark:text-gh-text mb-2">
            Welcome to Medrae MedTube
          </h2>

        </div>
      </div>
    );
  }

  if (loading && videos.length === 0) {
    return <MedTubeSkeleton />;
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gh-l-border dark:border-gh-border">
        <p className="text-[10px]   uppercase tracking-widest text-gh-l-muted dark:text-gh-muted">
          Browse
        </p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
        {allTabs.map((c) => {
          const Icon = c.icon;
          const isActive = activeTab === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectCategory(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isActive
                ? "bg-primary text-primary-foreground"
                : "text-gh-l-text/80 dark:text-gh-text/80 hover:bg-gh-l-hover dark:hover:bg-gh-hover hover:text-gh-l-text dark:hover:text-gh-text"
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{c.name}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t border-gh-l-border dark:border-gh-border space-y-1">
        <button
          onClick={() => { setShowResetConfirm(true); setDrawerOpen(false); }}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gh-l-text/70 dark:text-gh-text/70 hover:bg-gh-l-hover dark:hover:bg-gh-hover hover:text-gh-l-text dark:hover:text-gh-text transition-colors text-left"
        >
          Reset watch history
        </button>
        <button
          onClick={() => { triggerVideoSync(); setDrawerOpen(false); }}
          disabled={syncing}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gh-l-text/70 dark:text-gh-text/70 hover:bg-gh-l-hover dark:hover:bg-gh-hover hover:text-gh-l-text dark:hover:text-gh-text transition-colors text-left disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync YouTube"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-gh-l-canvas dark:bg-gh-canvas">
      {/* ─── Top bar ─── */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 md:px-5 py-2.5 md:py-3 border-b border-gh-l-border dark:border-gh-border bg-gh-l-canvas/95 dark:bg-gh-canvas/95 backdrop-blur-sm z-30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (watchingVideo) {
                if (activeTab === "all" && !watchingVideo.is_watched) markVideoAsWatched(watchingVideo.id);
                setWatchingVideo(null);
              } else { navigate(-1); }
            }}
            aria-label="Back"
            className="p-2 -ml-1 rounded-full hover:bg-gh-l-hover dark:hover:bg-gh-hover transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gh-l-text dark:text-gh-text" />
          </button>
          {!watchingVideo && (
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open categories"
              className="xl:hidden p-2 rounded-full hover:bg-gh-l-hover dark:hover:bg-gh-hover transition-colors"
            >
              <Menu className="h-5 w-5 text-gh-l-text dark:text-gh-text" />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col items-center">
          <h1 className="text-sm md:text-base   tracking-tight text-gh-l-text dark:text-gh-text leading-none">
            Medrae MedTube
          </h1>
          <span className="text-[9px] md:text-[10px] font-semibold text-gh-l-muted dark:text-gh-muted  tracking-widest mt-0.5 truncate max-w-[60vw]">
            {watchingVideo
              ? watchingVideo.uploader
              : totalCount > 0
                ? `${totalCount} videos`
                : "Educational library"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!watchingVideo && (
            <>
              <Button variant="ghost" size="sm" onClick={triggerVideoSync} disabled={syncing}
                className="h-9 px-3 text-xs font-semibold text-gh-l-muted dark:text-gh-muted hover:text-gh-l-text dark:hover:text-gh-text">
                {syncing ? "Syncing…" : "Sync"}
              </Button>
              <Button size="sm" onClick={() => setShowUploadForm(v => !v)}
                className="h-9 px-3 text-xs font-semibold">
                {showUploadForm ? "Cancel" : "Add"}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex-1 min-h-0 flex">
        {!watchingVideo && (
          <aside className="hidden xl:flex w-56 shrink-0 border-r border-gh-l-border dark:border-gh-border bg-gh-l-canvas dark:bg-gh-canvas">
            {SidebarContent}
          </aside>
        )}

        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              className="xl:hidden fixed inset-0 z-40 flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/50"
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              {/* Sliding panel */}
              <motion.aside
                className="relative w-64 max-w-[80vw] h-full bg-gh-l-canvas dark:bg-gh-canvas border-r border-gh-l-border dark:border-gh-border shadow-xl flex flex-col"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 32,
                  mass: 0.9,
                }}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gh-l-border dark:border-gh-border">
                  <span className="text-sm   text-gh-l-text dark:text-gh-text">
                    Medrae MedTube
                  </span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close"
                    className="p-1.5 rounded-full hover:bg-gh-l-hover dark:hover:bg-gh-hover"
                  >
                    <X className="h-4 w-4 text-gh-l-text dark:text-gh-text" />
                  </button>
                </div>
                {SidebarContent}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {watchingVideo ? (
          <WatchPage
            video={watchingVideo}
            relatedVideos={filteredVideos.filter(v => v.id !== watchingVideo.id)}
            onSelectVideo={(v) => { setWatchingVideo(v); recordView(v.id); }}
            onLike={handleLikeToggle}
            formatViews={formatViews}
            formatDate={formatDate}
            loadMoreRef={loadMoreRef}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={() => loadVideos(page, false)}
          />
        ) : (
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="w-full px-3 md:px-5 lg:px-6 py-3 md:py-5 space-y-4">
              {showUploadForm && (
                <div className="space-y-3 md:space-y-4 rounded-xl p-4 md:p-5 bg-gh-l-card dark:bg-gh-card border border-gh-l-border dark:border-gh-border">
                  <div>
                    <Input
                      placeholder="Video URL (YouTube, Vimeo, or direct MP4 link)"
                      value={videoUrl}
                      onChange={(e) => { setVideoUrl(e.target.value); if (urlError) setUrlError(""); }}
                      className="rounded-lg md:rounded-xl border-0 bg-gh-l-hover/60 dark:bg-gh-hover/40"
                    />
                    {urlError && <p className="text-red-500 text-xs md:text-sm mt-1">{urlError}</p>}
                    <p className="text-[10px] md:text-xs text-gh-l-muted dark:text-gh-muted mt-1">
                      Supported: YouTube, Vimeo, direct video links (.mp4, .webm, etc.)
                    </p>
                  </div>
                  <Input placeholder="Video Title" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg md:rounded-xl border-0 bg-gh-l-hover/60 dark:bg-gh-hover/40" />
                  <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg md:rounded-xl border-0 bg-gh-l-hover/60 dark:bg-gh-hover/40" />
                  <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-lg md:rounded-xl border-0 bg-gh-l-hover/60 dark:bg-gh-hover/40" />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full rounded-lg md:rounded-xl border-0 bg-gh-l-hover/60 dark:bg-gh-hover/40">
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

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gh-l-muted dark:text-gh-muted" />
                <Input
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-0 bg-gh-l-hover/70 dark:bg-gh-hover/40 h-10"
                />
              </div>

              {loading && videos.length === 0 ? (
                <MedTubeSkeleton />
              ) : filteredVideos.length === 0 && !loading ? (
                <div className="text-center py-12 px-2">
                  <p className="text-gh-l-muted dark:text-gh-muted mb-4">
                    {activeTab === "all"
                      ? "You've watched all videos! Click 'Reset Watch History' to see them again."
                      : `No videos found in ${categories.find(c => c.id === activeTab)?.name || activeTab}`}
                  </p>
                  {activeTab === "all" && (
                    <Button onClick={() => setShowResetConfirm(true)} variant="outline"
                      className="border-0 bg-gh-l-hover/70 dark:bg-gh-hover/40">
                      <RefreshCw className="h-4 w-4 mr-2" /> Reset Watch History
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className={VIDEO_GRID_CLASS}>
                    {filteredVideos.map((video) => (
                      <Card
                        key={video.id}
                        onClick={() => { setWatchingVideo(video); recordView(video.id); }}
                        className="group cursor-pointer transition-all hover:shadow-lg border-0 rounded-xl shadow-none bg-gh-l-card dark:bg-gh-card"
                      >
                        <div className="relative">
                          <div className="relative w-full aspect-video">
                            <VideoPlayer
                              video={video}
                              className="rounded-t-xl"
                              onPlay={() => {
                                recordView(video.id);
                                if (activeTab === "all" && !video.is_watched) markVideoAsWatched(video.id);
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl flex items-center justify-center pointer-events-none">
                            <Button size="lg" className="rounded-full w-14 h-14 pointer-events-auto"
                              onClick={(e) => { e.stopPropagation(); setWatchingVideo(video); recordView(video.id); }}>
                              <Play className="h-5 w-5" />
                            </Button>
                          </div>
                          <Badge className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px]">{video.duration || "00:00"}</Badge>
                          <Badge className="absolute top-2 left-2 bg-black/70 text-white text-[9px]">
                            {video.embed_type === 'youtube' ? 'YouTube' : video.embed_type === 'vimeo' ? 'Vimeo' : video.embed_type === 'direct' ? 'Direct' : 'Video'}
                          </Badge>
                          {video.is_watched && activeTab === "all" && (
                            <Badge className="absolute top-2 right-2 bg-green-600 text-white text-[9px]">Watched ✓</Badge>
                          )}
                        </div>

                        <CardHeader className="pb-1.5 px-3 pt-2.5">
                          <CardTitle className="text-sm sm:line-clamp-2 group-hover:text-primary transition-colors text-gh-l-text dark:text-gh-text">
                            {video.title}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={video.uploader_avatar || "/placeholder.svg"} className="object-cover" />
                              <AvatarFallback className="flex items-center justify-center text-[8px]">
                                {video.uploader?.[0]?.toUpperCase() || "👤"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-gh-l-muted dark:text-gh-muted truncate">{video.uploader}</span>
                          </div>
                        </CardHeader>

                        <CardContent className="px-3 pt-0 pb-3">
                          <div className="flex items-center gap-1 text-[10px] text-gh-l-muted dark:text-gh-muted mb-1.5">
                            <Clock className="h-2.5 w-2.5" /> {formatDate(video.created_at)}
                          </div>
                          <CardDescription className="line-clamp-3 sm:line-clamp-2 text-xs mb-2 text-gh-l-muted dark:text-gh-muted">
                            {video.description}
                          </CardDescription>
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {video.tags?.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gh-l-muted dark:text-gh-muted">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {formatViews(video.views_count)}
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLikeToggle(video.id); }}
                                className="inline-flex items-center gap-1 hover:text-rose-500 transition-colors"
                              >
                                <Heart className="h-3 w-3 transition-transform active:scale-90"
                                  fill={video.liked_by_me ? "currentColor" : "none"}
                                  stroke="currentColor"
                                  color={video.liked_by_me ? "#e11d48" : undefined} />
                                {video.likes_count}
                              </button>
                            </div>
                            {user?.id === video.uploaded_by && (
                              <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteVideo(video); }}
                                variant="ghost"
                                className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-700 active:scale-95 transition h-auto">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {hasMore && filteredVideos.length > 0 && (
                    <div ref={loadMoreRef} className="flex justify-center py-6 md:py-8">
                      {loadingMore ? (
                        <div className="flex items-center gap-2 text-gh-l-muted dark:text-gh-muted text-xs">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading more videos...
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => loadVideos(page, false)}
                          className="gap-2 text-xs border-0 bg-gh-l-hover/70 dark:bg-gh-hover/40">
                          <Loader2 className="h-3 w-3" /> Load More
                        </Button>
                      )}
                    </div>
                  )}

                  {!hasMore && videos.length > 0 && (
                    <div className="text-center py-4 text-gh-l-muted dark:text-gh-muted text-xs">
                      You've reached the end of the list 🎉
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Reset Confirm */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="rounded-xl border-0">
          <DialogHeader>
            <DialogTitle>Reset Watch History?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">This will reset your watch history and all videos will reappear in your feed. Your likes and comments will not be affected.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}
                className="border-0 bg-gh-l-hover/70 dark:bg-gh-hover/40">Cancel</Button>
              <Button onClick={resetWatchHistory}>Reset History</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}