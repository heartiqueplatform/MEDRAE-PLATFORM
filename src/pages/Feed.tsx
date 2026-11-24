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

import { clearMediaPanelCaches } from "@/components/Feed/FeedMediaPanel";
import { uploadProgressStore } from "@/lib/uploadProgressStore";
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

// ── Shared image-row mapper ──────────────────────────────
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

// ── Upload constants ─────────────────────────────────────
const IMAGES_PAGE_SIZE = 15;
const UPLOAD_TIMEOUT_MS = 30_000;
const UPLOAD_MAX_RETRIES = 3;
const UPLOAD_CONCURRENCY = 3;
const UPLOAD_DB = "medrae-uploads";
const UPLOAD_STORE = "pending";

// ── Module-scope upload worker with retry + timeout ──────
async function uploadToCloudinary(file: File): Promise<string> {
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
}

async function uploadWithRetry(file: File): Promise<string> {
  let lastErr: any = null;
  for (let attempt = 0; attempt < UPLOAD_MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race<string>([
        uploadToCloudinary(file),
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error("upload timeout")),
            UPLOAD_TIMEOUT_MS
          )
        ),
      ]);
      return result;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt)));
    }
  }
  throw lastErr ?? new Error("upload failed");
}

// ── Concurrency runner ───────────────────────────────────
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => next())
  );
  return results;
}

// ── IndexedDB helpers ────────────────────────────────────
function openUploadDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE)) {
        db.createObjectStore(UPLOAD_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readPendingEntries(): Promise<any[]> {
  const db = await openUploadDB();
  if (!db.objectStoreNames.contains(UPLOAD_STORE)) {
    db.close();
    return [];
  }
  const rows = await new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE, "readonly");
    const req = tx.objectStore(UPLOAD_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

async function deletePendingEntry(id: string): Promise<void> {
  const db = await openUploadDB();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(UPLOAD_STORE, "readwrite");
    tx.objectStore(UPLOAD_STORE).delete(id);
    tx.oncomplete = () => resolve();
  });
  db.close();
}

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

  // guard against overlapping drain runs / state feedback loops
  const drainingRef = useRef(false);

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
    const t = setTimeout(() => setFeedbackMessage(null), 4000);
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

  // Lock body scroll when fullscreen image viewer is open
  useEffect(() => {
    if (!viewerOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
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

        const savedAnswers = JSON.parse(
          localStorage.getItem(`feed_answers_${uid}`) || "{}"
        );
        setAnswers(savedAnswers);

        const cachedCount = localStorage.getItem(`feed_count_${uid}`);
        if (cachedCount) setQuestionCount(parseInt(cachedCount));

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
  useEffect(() => {
    if (activeTab !== "images" || !userId || isLoadingImages) return;
    if (imagePage === 0 && feedImages.length > 0) return;
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

      const [{ data: likes }, { data: commentsData }, { data: quizzes }] =
        await Promise.all([
          supabase
            .from("qfeed_likes")
            .select("question_id, user_id")
            .in("question_id", ids),
          supabase
            .from("qfeed_comments")
            .select("id, question_id")
            .in("question_id", ids),
          supabase
            .from("quizzes")
            .select("id, title, created_by")
            .in("id", quizIds),
        ]);

      const creatorIds = [
        ...new Set(
          (quizzes ?? []).map((q) => q.created_by).filter((v): v is string => !!v)
        ),
      ];
      const { data: creatorProfiles } =
        creatorIds.length > 0
          ? await supabase
            .from("profiles")
            .select(
              "user_id, name, avatar_url, role, is_verified_contributor, contributor_tier"
            )
            .in("user_id", creatorIds)
          : { data: [] as any[] };

      const likesMap = new Map<string, any[]>();
      likes?.forEach((l) => {
        if (!likesMap.has(l.question_id)) likesMap.set(l.question_id, []);
        likesMap.get(l.question_id)!.push(l);
      });
      const commentsCountMap = new Map<string, number>();
      commentsData?.forEach((c) => {
        commentsCountMap.set(
          c.question_id,
          (commentsCountMap.get(c.question_id) || 0) + 1
        );
      });
      const quizMap = new Map<string, any>();
      quizzes?.forEach((q) => quizMap.set(q.id, q));
      const creatorMap = new Map<string, any>();
      (creatorProfiles ?? []).forEach((p) => creatorMap.set(p.user_id, p));

      return shuffled.map((q: any) => {
        const quiz = quizMap.get(q.quiz_id);
        const creator = quiz?.created_by
          ? creatorMap.get(quiz.created_by)
          : null;
        return {
          ...q,
          qfeed_likes: likesMap.get(q.id) || [],
          comments_count: commentsCountMap.get(q.id) || 0,
          quiz_title: quiz?.title || "Untitled Quiz",
          author_id: quiz?.created_by ?? null,
          author_name: creator?.name ?? null,
          author_avatar: creator?.avatar_url ?? null,
          author_role: creator?.role ?? null,
          author_verified: creator?.is_verified_contributor === true,
          author_tier: creator?.contributor_tier ?? null,
        };
      });
    }, 120_000);
  };

  const loadMore = useCallback(async () => {
    if (loading || !userId || !hasMore) return;
    setLoading(true);
    const next = page + 1;
    const fresh = await fetchQuestions(next, 8, userId);
    if (fresh.length > 0) {
      const existing = new Set(questions.map((q) => q.id));
      const filtered = fresh.filter(
        (q) => !existing.has(q.id) && !answers[q.id]
      );
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
      if (counts[row.selected_option] !== undefined)
        counts[row.selected_option]++;
    });
    setVoteStats((prev) => ({ ...prev, [qid]: counts }));
    return counts;
  };

  // ── Answer handler ───────────────────────────────────────
  const handleAnswer = async (q: any, option: string) => {
    if (!user?.id || answers[q.id]) return;
    const isCorrect = q.correct_answer === option;

    if (!isMuted) playSound(isCorrect ? "tap-correct" : "tap-wrong", false);
    if (navigator.vibrate)
      navigator.vibrate(isCorrect ? 50 : [100, 50, 100]);

    setAnswers((prev) => {
      const next = { ...prev, [q.id]: option };
      localStorage.setItem(`feed_answers_${user.id}`, JSON.stringify(next));
      return next;
    });

    if (isCorrect) {
      setCorrectStreak((p) => p + 1);
      setWrongStreak(0);
      confetti({
        particleCount: 120,
        spread: 70,
        startVelocity: 60,
        origin: { y: 0.7 },
      });
    } else {
      setWrongStreak((p) => p + 1);
      setCorrectStreak(0);
    }

    await supabase
      .from("qfeed_seen")
      .upsert(
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
      .select(
        "id, comment_text, created_at, user_id, parent_id, profiles!user_id(name, avatar_url)"
      )
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
        comment_likes:
          commentLikes?.filter((l: any) => l.comment_id === c.id) || [],
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
      .select(
        `id, comment_text, created_at, user_id, parent_id, profiles:user_id(name, avatar_url)`
      )
      .single();
    if (inserted) {
      setComments((prev) => [...prev, { ...inserted, comment_likes: [] }]);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === activeQuestion
            ? { ...q, comments_count: (q.comments_count || 0) + 1 }
            : q
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
      await supabase
        .from("qfeed_comment_likes")
        .delete()
        .match({ comment_id: commentId, user_id: user.id });
    } else {
      await supabase
        .from("qfeed_comment_likes")
        .insert({ comment_id: commentId, user_id: user.id });
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
    setComments((prev) =>
      prev.filter((c) => c.id !== commentId && c.parent_id !== commentId)
    );
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === activeQuestion
          ? { ...q, comments_count: Math.max(0, (q.comments_count || 1) - 1) }
          : q
      )
    );
  };

  // ── Image upload (parallel + per-file safe) ──────────────
  const handleImageUpload = async (isRelated: boolean = false) => {
    if (!uploadFiles.length || !user) return;
    setUploading(true);

    const filesSnapshot = [...uploadFiles];
    const title = imageTitle;
    const description = imageDescription;

    const postGroupId = isRelated
      ? (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random()}`
      : null;

    const total = filesSnapshot.length;
    const label = total === 1 ? "photo" : "photos";
    uploadProgressStore.start(label, total);

    let completed = 0;

    let results: (string | null)[] = [];
    try {
      results = await runWithConcurrency(
        filesSnapshot,
        UPLOAD_CONCURRENCY,
        async (file) => {
          try {
            const url = await uploadWithRetry(file);
            completed++;
            uploadProgressStore.progress(label, completed, total);
            return url;
          } catch (err) {
            console.warn("[Feed] upload failed for one file:", err);
            completed++;
            uploadProgressStore.progress(label, completed, total);
            return null;
          }
        }
      );
    } finally {
      // free the spinner even if everything exploded
    }

    const orderedUrls = results
      .map((url, i) => ({ url, i }))
      .filter((x): x is { url: string; i: number } => !!x.url)
      .map((x, order) => ({
        image_url: x.url,
        storage_path: "cloudinary",
        added_by: user.id,
        title: title || null,
        description: description || null,
        post_group_id: postGroupId,
        post_group_order: order,
      }));

    const failedCount = results.length - orderedUrls.length;

    if (orderedUrls.length === 0) {
      setUploading(false);
      uploadProgressStore.fail(0, total, label, "Upload failed");
      setFeedbackMessage(
        "Upload failed — check your connection and try again."
      );
      return;
    }
    const inserted: any[] = [];
    for (const row of orderedUrls) {
      try {
        const { data, error } = await supabase
          .from("qfeed_images")
          .insert(row)
          .select()
          .single();
        if (!error && data) inserted.push(data);
      } catch (err) {
        console.warn("[Feed] row insert failed:", err);
      }
    }

    if (inserted.length > 0) {
      setFeedImages((prev) => [...inserted, ...prev]);
    }

    setUploadFiles([]);
    setImageTitle("");
    setImageDescription("");
    setShowUpload(false);
    setUploading(false);

    if (failedCount > 0) {
      setFeedbackMessage(
        `${orderedUrls.length} uploaded, ${failedCount} skipped.`
      );
    }
    uploadProgressStore.succeed(orderedUrls.length, total, label);
  };

  // ── Background-safe drain of IndexedDB queue ─────────────
  const drainPendingUploads = useCallback(async () => {
    if (!userId) return;
    if (drainingRef.current) return;
    drainingRef.current = true;
    let touched = false;
    try {
      const rows = await readPendingEntries();
      const mine = rows.filter((r) => r.meta?.userId === userId);
      if (mine.length === 0) return;

      touched = true;
      setUploading(true);
      for (const entry of mine) {
        try {
          const url = await uploadWithRetry(entry.file);
          const isRelated = entry.meta.related === true;
          const groupId = isRelated
            ? entry.meta.groupId ||
            (crypto as any).randomUUID?.() ||
            `${Date.now()}-${Math.random()}`
            : null;

          const { data } = await supabase
            .from("qfeed_images")
            .insert({
              image_url: url,
              storage_path: "cloudinary",
              added_by: userId,
              title: entry.meta.title || null,
              description: entry.meta.description || null,
              post_group_id: groupId,
              post_group_order: entry.meta.order ?? 0,
            })
            .select()
            .single();

          if (data) setFeedImages((prev) => [data, ...prev]);
          await deletePendingEntry(entry.id);
        } catch (err) {
          console.warn("[Feed] drain failed for one entry:", err);
        }
      }
    } catch {
      /* IndexedDB unavailable — ignore */
    } finally {
      if (touched) setUploading(false);
      drainingRef.current = false;
    }
  }, [userId]);

  // Resume pending uploads on mount + when app becomes visible
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => {
      drainPendingUploads();
    }, 1500);

    const onVisible = () => {
      if (document.visibilityState === "visible") drainPendingUploads();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, drainPendingUploads]);

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
    if (!img?.id) return;
    const { error } = await supabase
      .from("qfeed_images")
      .delete()
      .eq("id", img.id);
    if (error) {
      setFeedbackMessage("Couldn't delete — try again.");
      return;
    }
    setFeedImages((prev) => prev.filter((i) => i.id !== img.id));
    setFeedbackMessage("Deleted");
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
      <div className="sticky top-0 z-40 w-full bg-transparent">
        <div className="w-full max-w-4xl mx-auto">
          <FeedTabs
            active={activeTab}
            onChange={setActiveTab}
            counts={{ questions: questionCount, images: feedImages.length }}
          />
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
                await supabase
                  .from("qfeed_seen")
                  .delete()
                  .eq("user_id", user.id);
                localStorage.removeItem(`feed_questions_${user.id}`);
                localStorage.removeItem(`feed_answers_${user.id}`);
                localStorage.removeItem(`feed_count_${user.id}`);
                setQuestions([]);
                setAnswers({});
                setQuestionCount(0);
              }}
              onResetImages={async () => {
                if (!user?.id) return;
                await supabase
                  .from("seen_images")
                  .delete()
                  .eq("user_id", user.id);
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

          <div className="py-6 flex justify-center"></div>
        </div>
      </PullToRefresh>

      {createPortal(
        <FeedFeedbackOverlay
          message={feedbackMessage}
          onClose={() => setFeedbackMessage(null)}
        />,
        document.body
      )}

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
              style={{ overflow: "hidden", touchAction: "pan-y pinch-zoom" }}
            >
              <img
                key={activeImage.id}
                src={
                  activeImage.image_url?.includes("cloudinary")
                    ? activeImage.image_url.replace(
                      "/upload/",
                      "/upload/w_800,f_auto,q_auto/"
                    )
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