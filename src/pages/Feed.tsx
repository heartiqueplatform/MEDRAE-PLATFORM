"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import confetti from "canvas-confetti";
import { createPortal } from "react-dom";
import { X, Trash2, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FeedTabs, { FeedTab } from "@/components/Feed/FeedTabs";
import FeedQuestionsTab from "@/components/Feed/FeedQuestionsTab";
import FeedImagesTab from "@/components/Feed/FeedImagesTab";
import FeedCasesTab from "@/components/Feed/FeedCasesTab";
import FeedMoreTab from "@/components/Feed/FeedMoreTab";
import WardCaseFeed from "@/components/MicroCase/WardCaseFeed";
import FeedFeedbackOverlay from "@/components/Feed/FeedFeedbackOverlay";
import CommentsModal from "@/components/Feed/CommentsModal";
import { TermsButton } from "@/components/ui/TermsButton";
import { clearMediaPanelCaches } from "@/components/Feed/FeedMediaPanel";

// ── Request caches ────────────────────────────────────────
const pendingRequests = new Map<string, Promise<any>>();
const requestCache = new Map<string, { data: any; at: number }>();

export const clearFeedCaches = () => {
  requestCache.clear();
  pendingRequests.clear();
};

const fetchWithDedupe = async (
  key: string,
  fetcher: () => Promise<any>,
  ttl = 300_000
) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.at < ttl) return cached.data;
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const p = fetcher()
    .then((data) => {
      requestCache.set(key, { data, at: Date.now() });
      pendingRequests.delete(key);
      return data;
    })
    .catch((err) => {
      pendingRequests.delete(key);
      throw err;
    });
  pendingRequests.set(key, p);
  return p;
};

// ── Shared image-row mapper (used in 3 places, was duplicated) ──
const mapImageRow = (row: any) => ({
  id: row.id,
  image_url: row.image_url,
  description: row.description,
  title: row.title,
  storage_path: "cloudinary",
  added_by: row.added_by,
  created_at: row.created_at,
  post_group_id: row.post_group_id,
  post_group_order: row.post_group_order,
  profiles: { name: row.uploader_name, avatar_url: row.uploader_avatar },
});

const IMAGES_PAGE_SIZE = 15;

export default function Feed() {
  const session = useSession();
  const userId = session?.user?.id;

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("questions");

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [voteStats, setVoteStats] = useState<Record<string, any>>({});
  const [questionCount, setQuestionCount] = useState(0);
  const [userTokens, setUserTokens] = useState(0);
  const navigate = useNavigate();
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [feedImages, setFeedImages] = useState<any[]>([]);
  const [imagePage, setImagePage] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(true);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageTitle, setImageTitle] = useState("");
  const [imageDescription, setImageDescription] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<any>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);

  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem("feed_isMuted");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("feed_isMuted", JSON.stringify(isMuted));
  }, [isMuted]);

  // Clear caches when user changes
  useEffect(() => {
    clearFeedCaches();
    clearMediaPanelCaches();
    return () => {
      clearFeedCaches();
      clearMediaPanelCaches();
    };
  }, [userId]);

  // Feedback overlay auto-dismiss
  useEffect(() => {
    if (!feedbackMessage) return;
    const t = setTimeout(() => setFeedbackMessage(null), 3500);
    return () => clearTimeout(t);
  }, [feedbackMessage]);

  // Streak-driven feedback
  useEffect(() => {
    if (correctStreak > 0 && correctStreak % 5 === 0) {
      setFeedbackMessage(
        "🏆 Outstanding work! Reaching this streak shows excellent focus and consistency. Keep up the great momentum you're making impressive progress."
      );
      playSound("trivia-finish");
    } else if (correctStreak > 0 && correctStreak % 3 === 0) {
      setFeedbackMessage(
        "🔥 Great job! Your effort is clearly paying off. Each correct answer strengthens your understanding keep going."
      );
      playSound("medrae");
    }
    if (wrongStreak > 0 && wrongStreak % 3 === 0) {
      setFeedbackMessage(
        "💬 Take a moment to review the concept and consider the hint provided. Learning takes practice, and every attempt brings you closer to mastering the topic."
      );
      playSound("alert-sound");
    }
  }, [correctStreak, wrongStreak]);
  // ── Lock body scroll when fullscreen image viewer is open ──
  useEffect(() => {
    if (!viewerOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [viewerOpen]);

  // ── Load user + initial cached state ─────────────────────
  // ── ALSO PREFETCH IMAGES HERE so inline media panels show ─
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (!cancelled) setLoading(false);
          return;
        }
        if (cancelled) return;
        setUser(data.user);
        const uid = data.user.id;

        // Load tokens from profiles (XP)
        supabase
          .from("profiles")
          .select("tokens")
          .eq("user_id", uid)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (!cancelled && profile?.tokens != null) {
              setUserTokens(profile.tokens);
            }
          });

        const savedAnswers = JSON.parse(localStorage.getItem(`feed_answers_${uid}`) || "{}");
        setAnswers(savedAnswers);

        const cachedCount = localStorage.getItem(`feed_count_${uid}`);
        if (cachedCount) setQuestionCount(parseInt(cachedCount));

        // ── Fire questions AND images in parallel ──
        const [fresh, imageRows] = await Promise.all([
          fetchQuestions(0, 8, uid),
          fetchFirstImageBatch(uid),
        ]);

        if (cancelled) return;

        setQuestions(fresh.filter((q: any) => !savedAnswers[q.id]));
        setPage(0);

        setFeedImages(imageRows);
        setImagePage(0);
        if (imageRows.length < IMAGES_PAGE_SIZE) setHasMoreImages(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Extra image pages when images tab opens ──────────────
  // Page 0 is already prefetched on mount. This effect only
  // handles page >= 1 when the user scrolls the Images tab.
  useEffect(() => {
    if (activeTab !== "images" || !userId || isLoadingImages) return;
    if (imagePage === 0 && feedImages.length > 0) return; // already loaded on mount
    const loadImages = async () => {
      setIsLoadingImages(true);
      try {
        const rows = await fetchImagesPage(userId, imagePage);
        if (!rows || rows.length === 0) {
          setHasMoreImages(false);
          if (imagePage === 0) setFeedImages([]);
        } else {
          setFeedImages((prev) => {
            if (imagePage === 0) return rows;
            const seen = new Set(prev.map((i) => i.id));
            return [...prev, ...rows.filter((r) => !seen.has(r.id))];
          });
          if (rows.length < IMAGES_PAGE_SIZE) setHasMoreImages(false);
        }
      } finally {
        setIsLoadingImages(false);
      }
    };
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId, imagePage]);

  // ── Image fetchers (shared, deduped) ─────────────────────
  const fetchFirstImageBatch = async (uid: string) => {
    return fetchWithDedupe(
      `unseen_images_page_0_user_${uid}`,
      async () => {
        const { data, error } = await supabase.rpc("get_unseen_feed_images", {
          p_user_id: uid,
          p_limit: IMAGES_PAGE_SIZE,
          p_offset: 0,
        });
        if (error) return [];
        return (data ?? []).map(mapImageRow);
      },
      60_000
    );
  };

  const fetchImagesPage = async (uid: string, pageNum: number) => {
    return fetchWithDedupe(
      `unseen_images_page_${pageNum}_user_${uid}`,
      async () => {
        const { data, error } = await supabase.rpc("get_unseen_feed_images", {
          p_user_id: uid,
          p_limit: IMAGES_PAGE_SIZE,
          p_offset: pageNum * IMAGES_PAGE_SIZE,
        });
        if (error) return [];
        return (data ?? []).map(mapImageRow);
      },
      60_000
    );
  };

  // ── fetchQuestions ───────────────────────────────────────
  const fetchQuestions = async (pageNum: number, limit: number, uid: string) => {
    const key = `questions_${uid}_p${pageNum}_l${limit}`;
    return fetchWithDedupe(key, async () => {
      const { data, error } = await supabase.rpc("get_unseen_questions", {
        p_user_id: uid,
        p_limit: limit,
        p_offset: pageNum * limit,
      });
      if (error || !data) return [];

      const shuffled = [...data].sort(() => Math.random() - 0.5);
      const ids = shuffled.map((q: any) => q.id);
      const quizIds = [...new Set(shuffled.map((q: any) => q.quiz_id))];

      const [{ data: likes }, { data: commentsData }, { data: quizzes }] = await Promise.all([
        supabase.from("qfeed_likes").select("question_id, user_id").in("question_id", ids),
        supabase.from("qfeed_comments").select("id, question_id").in("question_id", ids),
        supabase.from("quizzes").select("id, title").in("id", quizIds),
      ]);

      const likesMap = new Map<string, any[]>();
      likes?.forEach((l) => {
        if (!likesMap.has(l.question_id)) likesMap.set(l.question_id, []);
        likesMap.get(l.question_id)!.push(l);
      });
      const commentsCountMap = new Map<string, number>();
      commentsData?.forEach((c) => {
        commentsCountMap.set(c.question_id, (commentsCountMap.get(c.question_id) || 0) + 1);
      });
      const quizTitleMap = new Map<string, string>();
      quizzes?.forEach((q) => quizTitleMap.set(q.id, q.title));

      return shuffled.map((q: any) => ({
        ...q,
        qfeed_likes: likesMap.get(q.id) || [],
        comments_count: commentsCountMap.get(q.id) || 0,
        quiz_title: quizTitleMap.get(q.quiz_id) || "Untitled Quiz",
      }));
    }, 120_000);
  };

  const loadMore = useCallback(async () => {
    if (loading || !userId || !hasMore) return;
    setLoading(true);
    const next = page + 1;
    const fresh = await fetchQuestions(next, 8, userId);
    if (fresh.length > 0) {
      const existing = new Set(questions.map((q) => q.id));
      const filtered = fresh.filter((q) => !existing.has(q.id) && !answers[q.id]);
      setQuestions((prev) => [...prev, ...filtered]);
      setPage(next);
      if (filtered.length < 8) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }, [loading, userId, hasMore, page, questions, answers]);

  // ── Vote stats ───────────────────────────────────────────
  const fetchVoteStats = async (qid: string) => {
    if (voteStats[qid]) return voteStats[qid];
    const { data } = await supabase
      .from("qfeed_seen")
      .select("selected_option")
      .eq("question_id", qid)
      .limit(500);
    const counts = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    data?.forEach((row: any) => {
      if (counts[row.selected_option] !== undefined) counts[row.selected_option]++;
    });
    setVoteStats((prev) => ({ ...prev, [qid]: counts }));
    return counts;
  };

  // ── Answer handler ───────────────────────────────────────
  const handleAnswer = async (q: any, option: string) => {
    if (!user?.id || answers[q.id]) return;
    const isCorrect = q.correct_answer === option;

    if (!isMuted) playSound(isCorrect ? "tap-correct" : "tap-wrong", false);
    if (navigator.vibrate) navigator.vibrate(isCorrect ? 50 : [100, 50, 100]);

    setAnswers((prev) => {
      const next = { ...prev, [q.id]: option };
      localStorage.setItem(`feed_answers_${user.id}`, JSON.stringify(next));
      return next;
    });

    if (isCorrect) {
      setCorrectStreak((p) => p + 1);
      setWrongStreak(0);
      confetti({ particleCount: 120, spread: 70, startVelocity: 60, origin: { y: 0.7 } });
    } else {
      setWrongStreak((p) => p + 1);
      setCorrectStreak(0);
    }

    await supabase.from("qfeed_seen").upsert(
      { question_id: q.id, user_id: user.id, selected_option: option },
      { onConflict: "user_id,question_id" }
    );

    setQuestionCount((prev) => {
      const n = prev + 1;
      localStorage.setItem(`feed_count_${user.id}`, String(n));
      return n;
    });

    supabase
      .from("profiles")
      .select("tokens")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (profile?.tokens != null) setUserTokens(profile.tokens);
      });

    const counts = await fetchVoteStats(q.id);
    if (counts) setVoteStats((prev) => ({ ...prev, [q.id]: counts }));
  };

  // ── Like handler — INSTANT UI, silent DB write ────────────
  const handleLike = async (questionId: string, liked: boolean) => {
    if (!user?.id) return;

    if (navigator.vibrate) navigator.vibrate(10);
    if (!liked && !isMuted) playSound("tap-correct", false);

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const updated = liked
          ? q.qfeed_likes.filter((l: any) => l.user_id !== user.id)
          : [...q.qfeed_likes, { user_id: user.id }];
        return { ...q, qfeed_likes: updated };
      })
    );

    try {
      if (liked) {
        const { error } = await supabase
          .from("qfeed_likes")
          .delete()
          .match({ question_id: questionId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("qfeed_likes")
          .insert({ question_id: questionId, user_id: user.id });
        if (error) throw error;
      }
    } catch (err) {
      console.warn("[Feed] like failed, reverting:", err);
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== questionId) return q;
          const reverted = liked
            ? [...q.qfeed_likes, { user_id: user.id }]
            : q.qfeed_likes.filter((l: any) => l.user_id !== user.id);
          return { ...q, qfeed_likes: reverted };
        })
      );
    }
  };

  // ── Comments ─────────────────────────────────────────────
  const loadComments = async (questionId: string) => {
    setActiveQuestion(questionId);
    const { data } = await supabase
      .from("qfeed_comments")
      .select("id, comment_text, created_at, user_id, parent_id, profiles!user_id(name, avatar_url)")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true })
      .limit(100);

    const { data: commentLikes } = await supabase
      .from("qfeed_comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", data?.map((c) => c.id) || []);

    setComments(
      (data || []).map((c: any) => ({
        ...c,
        comment_likes: commentLikes?.filter((l: any) => l.comment_id === c.id) || [],
      }))
    );
  };

  const addComment = async () => {
    if (!user || !newComment.trim() || !activeQuestion) return;
    const { data: inserted } = await supabase
      .from("qfeed_comments")
      .insert({
        question_id: activeQuestion,
        user_id: user.id,
        parent_id: replyTo,
        comment_text: newComment,
      })
      .select(`id, comment_text, created_at, user_id, parent_id, profiles:user_id(name, avatar_url)`)
      .single();
    if (inserted) {
      setComments((prev) => [...prev, { ...inserted, comment_likes: [] }]);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === activeQuestion ? { ...q, comments_count: (q.comments_count || 0) + 1 } : q
        )
      );
      setNewComment("");
      setReplyTo(null);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!user) return;
    const c = comments.find((x) => x.id === commentId);
    const liked = c?.comment_likes?.some((l: any) => l.user_id === user.id);
    if (liked) {
      await supabase.from("qfeed_comment_likes").delete().match({ comment_id: commentId, user_id: user.id });
    } else {
      await supabase.from("qfeed_comment_likes").insert({ comment_id: commentId, user_id: user.id });
    }
    setComments((prev) =>
      prev.map((x) => {
        if (x.id !== commentId) return x;
        const updated = liked
          ? x.comment_likes.filter((l: any) => l.user_id !== user.id)
          : [...x.comment_likes, { user_id: user.id }];
        return { ...x, comment_likes: updated };
      })
    );
  };

  const deleteComment = async (commentId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("qfeed_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);
    if (error) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === activeQuestion
          ? { ...q, comments_count: Math.max(0, (q.comments_count || 1) - 1) }
          : q
      )
    );
  };

  // ── Image upload ─────────────────────────────────────────
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "js1gxxdv");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/dpj5vprwf/image/upload`,
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    return data.secure_url as string;
  };

  const handleImageUpload = async (isRelated: boolean = false) => {
    if (!uploadFiles.length || !user) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of uploadFiles) urls.push(await uploadToCloudinary(f));

      const postGroupId = isRelated
        ? (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random()}`
        : null;

      const rows = urls.map((url, i) => ({
        image_url: url,
        storage_path: "cloudinary",
        added_by: user.id,
        title: imageTitle || null,
        description: imageDescription || null,
        post_group_id: postGroupId,
        post_group_order: i,
      }));

      const { data: inserted } = await supabase
        .from("qfeed_images")
        .insert(rows)
        .select();

      if (inserted) setFeedImages((prev) => [...inserted, ...prev]);
      setUploadFiles([]);
      setImageTitle("");
      setImageDescription("");
      setShowUpload(false);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ── Image viewer ─────────────────────────────────────────
  const openViewer = (img: any) => {
    setActiveImage(img);
    setViewerOpen(true);
  };
  const closeViewer = () => {
    setViewerOpen(false);
    setTimeout(() => setActiveImage(null), 300);
  };
  const handleDeleteImage = async (img: any) => {
    if (!confirm("Delete this image?")) return;
    await supabase.from("qfeed_images").delete().eq("id", img.id);
    setFeedImages((prev) => prev.filter((i) => i.id !== img.id));
  };

  // ── Pull to refresh ──────────────────────────────────────
  const onRefresh = async () => {
    clearFeedCaches();
    clearMediaPanelCaches();
    setPage(0);
    setImagePage(0);
    setHasMore(true);
    setHasMoreImages(true);
    if (userId) {
      const [fresh, imageRows] = await Promise.all([
        fetchQuestions(0, 8, userId),
        fetchFirstImageBatch(userId),
      ]);
      setQuestions(fresh);
      setFeedImages(imageRows);
      if (imageRows.length < IMAGES_PAGE_SIZE) setHasMoreImages(false);
      supabase
        .from("profiles")
        .select("tokens")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.tokens != null) setUserTokens(data.tokens);
        });
    }
  };

  return (
    <>
      {/* Sticky header — TABS ONLY (no FeedControls) */}
      <div className="sticky top-0 z-40 w-full bg-white dark:bg-[#0d1117]">
        <div className="w-full max-w-4xl mx-auto flex items-center">

          <div className="flex-1 min-w-0">
            <FeedTabs
              active={activeTab}
              onChange={setActiveTab}
              counts={{ questions: questionCount, images: feedImages.length }}
            />
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={onRefresh}>
        <div
          data-scroll-container
          className="w-full max-w-4xl mx-auto pt-0 custom-scrollbar"
          style={{
            minHeight: "60vh",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {activeTab === "questions" && (
            <FeedQuestionsTab
              questions={questions}
              loading={loading}
              hasMore={hasMore}
              answers={answers}
              voteStats={voteStats}
              user={user}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              onAnswer={handleAnswer}
              onLike={handleLike}
              onOpenComments={loadComments}
              onLoadMore={loadMore}
              feedImages={feedImages}
              loadedImages={loadedImages}
              setLoadedImages={setLoadedImages}
              session={session}
              supabase={supabase}
              openViewer={openViewer}
              handleDeleteImage={handleDeleteImage}
              showUpload={showUpload}
              setShowUpload={setShowUpload}
              uploadFiles={uploadFiles}
              setUploadFiles={setUploadFiles}
              uploading={uploading}
              handleImageUpload={handleImageUpload}
              imageTitle={imageTitle}
              setImageTitle={setImageTitle}
              imageDescription={imageDescription}
              setImageDescription={setImageDescription}
            />
          )}

          {activeTab === "images" && (
            <FeedImagesTab
              feedImages={feedImages}
              loadedImages={loadedImages}
              setLoadedImages={setLoadedImages}
              session={session}
              supabase={supabase}
              user={user}
              openViewer={openViewer}
              handleDeleteImage={handleDeleteImage}
              showUpload={showUpload}
              setShowUpload={setShowUpload}
              uploadFiles={uploadFiles}
              setUploadFiles={setUploadFiles}
              uploading={uploading}
              handleImageUpload={handleImageUpload}
              imageTitle={imageTitle}
              setImageTitle={setImageTitle}
              imageDescription={imageDescription}
              setImageDescription={setImageDescription}
              hasMoreImages={hasMoreImages}
              isLoadingImages={isLoadingImages}
              onLoadMore={() => setImagePage((p) => p + 1)}
            />
          )}

          {activeTab === "cases" && <FeedCasesTab />}
          {activeTab === "community" && <WardCaseFeed user={user} />}

          {activeTab === "more" && (
            <FeedMoreTab
              user={user}
              session={session}
              questionCount={questionCount}
              userTokens={userTokens}
              onResetQuestions={async () => {
                if (!user?.id) return;
                await supabase.from("qfeed_seen").delete().eq("user_id", user.id);
                localStorage.removeItem(`feed_questions_${user.id}`);
                localStorage.removeItem(`feed_answers_${user.id}`);
                localStorage.removeItem(`feed_count_${user.id}`);
                setQuestions([]);
                setAnswers({});
                setQuestionCount(0);
              }}
              onResetImages={async () => {
                if (!user?.id) return;
                await supabase.from("seen_images").delete().eq("user_id", user.id);
                const { data } = await supabase
                  .from("qfeed_images")
                  .select("*")
                  .order("created_at", { ascending: true });
                setFeedImages(data || []);
              }}
              setFeedImages={setFeedImages}
              setQuestions={setQuestions}
              setAnswers={setAnswers}
              setQuestionCount={setQuestionCount}
            />
          )}

          <div className="py-6 flex justify-center">
            <TermsButton />
          </div>
        </div>
      </PullToRefresh>

      {/* Feedback overlay — z-max, above footer */}
      <FeedFeedbackOverlay
        message={feedbackMessage}
        onClose={() => setFeedbackMessage(null)}
      />

      {/* Image fullscreen viewer */}
      {createPortal(
        <AnimatePresence>
          {viewerOpen && activeImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[2147483647] bg-black flex items-center justify-center overflow-hidden touch-pan-y"
              onClick={closeViewer}
              style={{
                overflow: "hidden",
                touchAction: "pan-y pinch-zoom",
              }}
            >
              <img
                key={activeImage.id}
                src={
                  activeImage.image_url?.includes("cloudinary")
                    ? activeImage.image_url.replace("/upload/", "/upload/w_800,f_auto,q_auto/")
                    : activeImage.image_url
                }
                alt={activeImage.title || "Image"}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
              />
              {activeImage.added_by === user?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(activeImage);
                    closeViewer();
                  }}
                  className="absolute top-5 left-5 text-white bg-black/50 hover:bg-red-600 p-3 rounded-full"
                  aria-label="Delete"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeViewer();
                }}
                className="absolute top-5 right-5 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Comments modal */}
      <CommentsModal
        activeQuestion={activeQuestion}
        setActiveQuestion={setActiveQuestion}
        questions={questions}
        comments={comments}
        user={user}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        toggleCommentLike={toggleCommentLike}
        newComment={newComment}
        setNewComment={setNewComment}
        addComment={addComment}
        deleteComment={deleteComment}
      />
    </>
  );
}