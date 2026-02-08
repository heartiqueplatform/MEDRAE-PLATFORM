"use client";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useWindowSize } from "react-use";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Volume2, VolumeX, RotateCcw, Eraser, Trophy, RefreshCcw, ArrowUp, Upload, Star, Heart, MessageCircle, Reply, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"; // added
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { playSound } from "@/lib/soundManager";

import { Input } from "@/components/ui/input";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed
import Confetti from "react-confetti";
const safeParse = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

// Skeleton loader
const SkeletonCard = () => (
  <div className="animate-pulse border rounded-xl p-4 bg-muted/20">
    {/* FIXED HEIGHT CARD – NEVER JUMPS */}
    <div className="h-[260px] w-full flex flex-col justify-between">

      {/* User row placeholder */}
      <div className="flex iems-center gap-3">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        <div className="w-32 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Image placeholder (FIXED HEIGHT!!) */}
      <div className="w-full h-[160px] bg-gray-300 dark:bg-gray-700 rounded mt-4"></div>

      {/* Footer placeholder */}
      <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded mt-4"></div>
    </div>
  </div>
);
const enrichQuestions = async (questions: any[]) => {
  // Example enrichment — you can expand with real logic
  return questions.map(q => ({
    ...q,
    enriched: true, // placeholder field
  }));
};


export default function Feed() {
  // ✅ Feedback Power-Up tracking
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  // ✅ Feedback Power-Up message
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [answers, setAnswers] = useState({});
  const [page, setPage] = useState(0); // start from page 0, no localStorage
  const uploadControllers = useRef<AbortController[]>([]);

  const savedQuestions = JSON.parse(localStorage.getItem("questions")) || [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});


  const [questions, setQuestions] = useState(savedQuestions);
  const [loading, setLoading] = useState(savedQuestions.length === 0);
  // At the top of your Feed.tsx or component
  // Preload a single sound
  const tapAudio = typeof Audio !== "undefined" ? new Audio("/sounds/tap1.mp3") : null;

  // Track which counts should animate (zoom)

  const { width, height } = useWindowSize();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [activeQuestion, setActiveQuestion] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const loaderRef = useRef(null);
  const [feedImages, setFeedImages] = useState([]);
  const [seenImages, setSeenImages] = useState([]);
  const [showUpload, setShowUpload] = useState(false); // updated
  // 🔊 Load mute state from localStorage on first render
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem("feed_isMuted");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // 🔒 Save mute preference to localStorage
  useEffect(() => {
    localStorage.setItem("feed_isMuted", JSON.stringify(isMuted));
  }, [isMuted]);


  const [imageIndex, setImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const openViewer = (img) => {
    setActiveImage(img);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setTimeout(() => setActiveImage(null), 300); // smooth exit
  };
  const handleImageUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0 || !user)
      return alert("Select one or more images first.");

    setUploading(true);
    uploadControllers.current = []; // reset previous controllers

    try {
      const uploadedImages = [];

      for (const file of uploadFiles) {
        const controller = new AbortController();
        uploadControllers.current.push(controller); // store controller

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // 1️⃣ Upload to storage with signal for cancellation
        const { error: uploadError } = await supabase.storage
          .from("qfeed-images")
          .upload(filePath, file, { signal: controller.signal });

        if (uploadError) throw uploadError;

        // 2️⃣ Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("qfeed-images")
          .getPublicUrl(filePath);

        // 3️⃣ Insert record into database
        const { error: insertError, data: insertedData } = await supabase
          .from("qfeed_images")
          .insert({
            image_url: publicUrlData.publicUrl,
            storage_path: filePath,
            added_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        uploadedImages.push(insertedData);
      }

      setFeedImages((prev) => [...uploadedImages, ...prev]);
      setUploadFiles([]);
      alert("Images uploaded! Thank you for your contribution.");
    } catch (err: any) {
      if (err.name === "AbortError") {
        alert("Upload cancelled by user.");
      } else {
        console.error("Upload failed:", err);
        alert("Some uploads may have failed. Please try again.");
      }
    } finally {
      setUploading(false);
      uploadControllers.current = [];
    }
  };




  const handleDeleteImage = async (img) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    if (!img.storage_path) return alert("Image path missing. Cannot delete.");

    try {
      console.log("Deleting image from storage:", img.storage_path);

      // 1️⃣ Delete from storage (full path)
      const { data, error: storageError } = await supabase.storage
        .from("qfeed-images")
        .remove([img.storage_path]); //  exact match to uploaded path

      console.log("Storage delete result:", { data, storageError });

      if (storageError) throw storageError;

      // 2️⃣ Delete from database
      const { error: dbError } = await supabase
        .from("qfeed_images")
        .delete()
        .eq("id", img.id);

      if (dbError) throw dbError;

      // 3️⃣ Update UI
      setFeedImages(prev => prev.filter(i => i.id !== img.id));
      alert("Image deleted successfully!");
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("Failed to delete image. Check console.");
    }
  };




  // ✅ Helper to vibrate on button tap
  const vibrateTap = () => {
    if (navigator.vibrate) navigator.vibrate(50); // 50ms vibration
  };


  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const [user, setUser] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);

  // Load total answered count from DB (and cache in localStorage)
  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      try {
        // Try local cache first
        const cached = localStorage.getItem(`feed_count_${user.id}`);
        if (cached) setQuestionCount(parseInt(cached));

        // Fetch from DB
        const { count } = await supabase
          .from("qfeed_seen")
          .select("question_id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (count !== null) {
          setQuestionCount(count);
          localStorage.setItem(`feed_count_${user.id}`, count);
        }
      } catch (err) {
        console.error("❌ Failed loading question count:", err);
      }
    };
    loadCount();
  }, [user]);
  useEffect(() => {
    // ✅ Correct streak rewards (every 5 and 10)
    if (correctStreak > 0 && correctStreak % 10 === 0) {
      setFeedbackMessage(
        "🏆 Incredible streak! Keep shining—you’re amazing! Every answer you get right is a step closer to mastering this, and you’re doing wonderfully!"
      );
    } else if (correctStreak > 0 && correctStreak % 5 === 0) {
      setFeedbackMessage(
        "🔥 You’re on fire! Fantastic work, keep going! Your effort is paying off and each correct answer is proof of your progress!"
      );
    }

    // ✅ Wrong streak encouragement (every 3)
    if (wrongStreak > 0 && wrongStreak % 3 === 0) {
      setFeedbackMessage(
        "💬 Oops, don’t worry! Mistakes happen and that’s completely okay. Take a deep breath, reflect on what you’ve learned so far, and here’s a helpful hint to guide you forward. You’re doing great, and every attempt makes you stronger!"
      );
    }
  }, [correctStreak, wrongStreak]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = "Uploads are in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading]);

  useEffect(() => {
    if (!feedbackMessage) return;

    const timer = setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        setFeedbackMessage(null);
      }
    };

    if (feedbackMessage) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [feedbackMessage]);


  // Load all images once
  useEffect(() => {
    const loadImages = async () => {
      // 1️⃣ Get current logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // user not logged in

      try {
        // 2️⃣ Get all images with uploader info
        const { data: images, error: imgErr } = await supabase
          .from("qfeed_images")
          .select(`
  id,
  image_url,
  description,
  storage_path,
  added_by,
  created_at,

  profiles (
    name,
    avatar_url
  )
`)

          .order("created_at", { ascending: true });

        if (imgErr) throw imgErr;

        // 3️⃣ Get all images the user has already seen
        const { data: seen, error: seenErr } = await supabase
          .from("seen_images")
          .select("image_id")
          .eq("user_id", user.id);

        if (seenErr) throw seenErr;

        // 4️⃣ Filter out seen images
        const seenIds = seen.map((row) => row.image_id);
        const unseenImages = images.filter((img) => !seenIds.includes(img.id));

        // 5️⃣ Update state
        setFeedImages(unseenImages);

      } catch (err) {
        console.error("❌ Error loading images:", err);
      }
    };

    loadImages();

    // Optional: refetch on new uploads or after marking images as seen
    // You can trigger loadImages() manually whenever needed

  }, []);

  // Load user & restore localStorage safely with preloading
  useEffect(() => {
    let saveTimer: NodeJS.Timeout;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setUser(data.user);
      const userId = data.user.id;

      const storageKey = `feed_questions_${userId}`;
      const answersKey = `feed_answers_${userId}`;

      // 🔹 Restore answers
      const savedAnswers = JSON.parse(localStorage.getItem(answersKey) || "{}");
      setAnswers(savedAnswers);

      // 🔹 Restore cached questions (if fresh)
      const storedRaw = localStorage.getItem(storageKey);
      let cachedQuestions: any[] = [];

      if (storedRaw) {
        const parsed = JSON.parse(storedRaw);
        if (Date.now() - (parsed.lastSaved || 0) < 24 * 60 * 60 * 1000) {
          cachedQuestions = (parsed.questions || []).filter(
            (q) => q && q.id && !savedAnswers[q.id]
          );
        } else {
          localStorage.removeItem(storageKey);
        }
      }

      // 🚀 SHOW CACHED QUESTIONS IMMEDIATELY
      if (cachedQuestions.length > 0) {
        setQuestions(cachedQuestions);
        setLoading(false);
      }

      // 🚀 FAST FIRST FETCH (NON-BLOCKING)
      // 🚀 INITIAL LOAD — ONLY 10 QUESTIONS
      const INITIAL_LIMIT = 10;
      // NEW
      const fast = await fetchQuestions(0, INITIAL_LIMIT);
      setQuestions(fast);
      setLoading(false);

      // Enrich background
      enrichQuestions(fast).then((enriched) => {
        setQuestions((prev) => {
          const map = new Map(prev.map((q) => [q.id, q]));
          enriched.forEach((q) => map.set(q.id, q));
          return Array.from(map.values());
        });
      })
      // Remove background streaming entirely
      // Manual fetch only when needed

      // Example: fetch initial questions once
      const initQuestions = async () => {
        if (!user) return;

        const INITIAL_LIMIT = 10;
        const fresh = await fetchQuestions(0, INITIAL_LIMIT);
        setQuestions(fresh);
        setLoading(false);

        // Save to localStorage
        localStorage.setItem(
          `feed_questions_${user.id}`,
          JSON.stringify(fresh)
        );

        // Optional: enrich questions
        enrichQuestions(fresh).then((enriched) => {
          setQuestions(enriched);
        });
      };

      initQuestions();

    };

    init();

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);


  //  Sync answered questions to qfeed_seen whenever answers change
  useEffect(() => {
    if (!user) return;
    const answeredIds = Object.keys(answers);
    if (answeredIds.length === 0) return;

    const syncSeen = async () => {
      try {
        await supabase
          .from("qfeed_seen")
          .upsert(
            answeredIds.map((id) => ({
              question_id: id,
              user_id: user.id,
            })),
            { onConflict: "question_id,user_id" }
          );
      } catch (err) {
        console.error(" Failed syncing to qfeed_seen:", err);
      }
    };

    syncSeen();
  }, [user, answers]);

  // On page unload, mark all answered questions as seen in DB
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!user) return;
      const answeredIds = Object.keys(answers);
      if (answeredIds.length === 0) return;

      for (const id of answeredIds) {
        await supabase
          .from("qfeed_seen")
          .upsert(
            { question_id: id, user_id: user.id },
            { onConflict: "question_id,user_id" }
          );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user, answers]);

  // Place this inside Feed.tsx, above the component or at the top of the component
  const fetchQuestions = async (page = 0, limit = 25) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get already seen question IDs
    const { data: seenData, error: seenError } = await supabase
      .from("qfeed_seen")
      .select("question_id")
      .eq("user_id", user.id);

    if (seenError) {
      console.error("Seen fetch error:", seenError);
      return [];
    }

    const seenList = seenData?.map((s) => s.question_id) || [];

    // Fetch questions excluding seen ones
    const { data: questions, error: questionsError } = await supabase
      .from("quiz_questions")
      .select(
        "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation"
      )
      .not("id", "in", `(${seenList.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .range(page * limit, page * limit + limit - 1);

    if (questionsError) {
      console.error("Questions fetch error:", questionsError);
      return [];
    }

    if (!questions?.length) return [];

    // Shuffle
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const ids = shuffled.map((q) => q.id);
    const quizIds = [...new Set(shuffled.map((q) => q.quiz_id))];

    // Fetch likes, comments, quizzes in parallel
    const [
      { data: likes },
      { data: commentsData },
      { data: quizzes },
    ] = await Promise.all([
      supabase.from("qfeed_likes").select("question_id, user_id").in("question_id", ids),
      supabase.from("qfeed_comments").select("id, question_id").in("question_id", ids),
      supabase.from("quizzes").select("id, title").in("id", quizIds),
    ]);

    // Map for likes
    const likesMap = new Map<string, any[]>();
    likes?.forEach((l) => {
      if (!likesMap.has(l.question_id)) likesMap.set(l.question_id, []);
      likesMap.get(l.question_id)!.push(l);
    });

    // Map for comments count
    const commentsCountMap = new Map<string, number>();
    commentsData?.forEach((c) => {
      commentsCountMap.set(c.question_id, (commentsCountMap.get(c.question_id) || 0) + 1);
    });

    // Map for quiz titles
    const quizTitleMap = new Map<string, string>();
    quizzes?.forEach((q) => quizTitleMap.set(q.id, q.title));

    // Merge and return
    return shuffled.map((q) => ({
      ...q,
      qfeed_likes: likesMap.get(q.id) || [],
      comments_count: commentsCountMap.get(q.id) || 0,
      quiz_title: quizTitleMap.get(q.quiz_id) || "Untitled Quiz",
    }));
  };

  // Infinite scroll loader
  const loadMore = async () => {
    if (loading || !user || !hasMore) return;

    setLoading(true);
    const batchSize = 10;
    const nextPage = page + 1;

    const newData = await fetchQuestions(nextPage, batchSize);

    if (newData && newData.length > 0) {
      const existingIds = new Set(questions.map((q) => q.id));
      const filtered = newData.filter((q) => !existingIds.has(q.id));

      setQuestions((prev) => [...prev, ...filtered]);
      setPage(nextPage);

      if (filtered.length < batchSize) setHasMore(false);
    } else {
      setHasMore(false);
    }

    setLoading(false);
  };


  // Mark question seen
  const markSeen = async (id) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("qfeed_seen")
      .upsert(
        { question_id: id, user_id: user.id },
        { onConflict: "question_id,user_id" } // 👈 important
      )
      .select();

    if (error) {
      console.error("❌ markSeen error:", error);
    } else {
      console.log("✅ markSeen success:", data);
    }
  };

  // Answer a question - now removes it completely
  const handleAnswer = async (q, option) => {
    if (answers[q.id]) return;

    const isCorrect = q.correct_answer === option;
    const newAnswers = { ...answers, [q.id]: option };

    // ✅ Update streaks (logic only)
    if (isCorrect) {
      setCorrectStreak((prev) => prev + 1);
      setWrongStreak(0);
    } else {
      setWrongStreak((prev) => prev + 1);
      setCorrectStreak(0);
    }

    // 🎉 Existing confetti logic (unchanged)
    if (isCorrect) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // Save answer locally
    setAnswers(newAnswers);

    // Increment count only the first time answering this question
    // Increment count only the first time answering this question
    setQuestionCount((prev) => {
      const newCount = prev + 1;
      localStorage.setItem(`feed_count_${user.id}`, newCount);
      return newCount;
    });

    // ✅ Fetch questions safely from localStorage
    const freshData = JSON.parse(localStorage.getItem(`feed_questions_${user.id}`) || '[]');

    // ✅ Ensure it's an array before using .filter
    const fresh = Array.isArray(freshData) ? freshData : [];

    // ✅ Filter out answered questions
    const unansweredFresh = fresh.filter(q => !newAnswers[q.id]); // use newAnswers, not old answers

    // ✅ Save back to localStorage
    localStorage.setItem(
      `feed_questions_${user.id}`,
      JSON.stringify(unansweredFresh)
    );


  };
  // Toggle like question
  const toggleLike = async (questionId, liked) => {
    if (!user) return alert("Login first!");
    try {
      if (liked) {
        await supabase
          .from("qfeed_likes")
          .delete()
          .match({ question_id: questionId, user_id: user.id });
      } else {
        await supabase
          .from("qfeed_likes")
          .insert({ question_id: questionId, user_id: user.id });
      }

      // Update state immediately
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id === questionId) {
            const updatedLikes = liked
              ? q.qfeed_likes.filter((l) => l.user_id !== user.id)
              : [...q.qfeed_likes, { user_id: user.id }];
            return { ...q, qfeed_likes: updatedLikes };
          }
          return q;
        })
      );

      // Sync to localStorage
      localStorage.setItem(
        `feed_questions_${user.id}`,
        JSON.stringify(
          questions.map((q) =>
            q.id === questionId
              ? liked
                ? q.qfeed_likes.filter((l) => l.user_id !== user.id)
                : [...q.qfeed_likes, { user_id: user.id }]
              : q
          )
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Load comments + likes (with localStorage caching)
  const loadComments = async (questionId) => {
    setActiveQuestion(questionId);

    const savedComments = JSON.parse(
      localStorage.getItem(`feed_comments_${user.id}`) || "{}"
    );
    if (savedComments[questionId]) {
      setComments(savedComments[questionId]);
      return;
    }

    const { data, error } = await supabase
      .from("qfeed_comments")
      .select(
        "id, comment_text, created_at, user_id, parent_id, profiles(name, avatar_url)"
      )

      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (error) console.error(error);

    const { data: commentLikes } = await supabase
      .from("qfeed_comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", data?.map((c) => c.id) || []);

    const commentsWithLikes = (data || []).map((c) => ({
      ...c,
      comment_likes: commentLikes?.filter((l) => l.comment_id === c.id) || [],
    }));

    setComments(commentsWithLikes);

    savedComments[questionId] = commentsWithLikes;
    localStorage.setItem(
      `feed_comments_${user.id}`,
      JSON.stringify(savedComments)
    );
  };

  // Add comment
  const addComment = async () => {
    if (!user || !newComment.trim()) return;
    try {
      const { data: inserted } = await supabase
        .from("qfeed_comments")
        .insert({
          question_id: activeQuestion,
          user_id: user.id,
          parent_id: replyTo,
          comment_text: newComment,
        })
        .select()
        .single();

      setNewComment("");
      setReplyTo(null);

      // Update question comment count immediately
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === activeQuestion
            ? { ...q, comments_count: (q.comments_count || 0) + 1 }
            : q
        )
      );

      // Update comments state & localStorage per question
      setComments((prev) => {
        const updated = [...prev, { ...inserted, comment_likes: [] }];
        const savedComments = JSON.parse(
          localStorage.getItem(`feed_comments_${user.id}`) || "{}"
        );
        savedComments[activeQuestion] = updated;
        localStorage.setItem(
          `feed_comments_${user.id}`,
          JSON.stringify(savedComments)
        );
        return updated;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle comment like
  const toggleCommentLike = async (commentId) => {
    if (!user) return alert("Login first!");
    const comment = comments.find((c) => c.id === commentId);
    const liked = comment.comment_likes.some((l) => l.user_id === user.id);

    try {
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

      setComments((prev) => {
        const updated = prev.map((c) => {
          if (c.id === commentId) {
            const updatedLikes = liked
              ? c.comment_likes.filter((l) => l.user_id !== user.id)
              : [...c.comment_likes, { user_id: user.id }];
            return { ...c, comment_likes: updatedLikes };
          }
          return c;
        });

        const savedComments = JSON.parse(
          localStorage.getItem(`feed_comments_${user.id}`) || "{}"
        );
        savedComments[activeQuestion] = updated;
        localStorage.setItem(
          `feed_comments_${user.id}`,
          JSON.stringify(savedComments)
        );

        return updated;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 🔝 Load leaderboard (top users)
  const loadLeaderboard = async () => {
    if (!user) return;

    try {
      // 1️⃣ Fetch all qfeed_seen entries
      const { data: seenData, error: seenError } = await supabase
        .from("qfeed_seen")
        .select("user_id, question_id"); // no .group() here

      if (seenError) throw seenError;

      // 2️⃣ Count questions answered per user
      const countsMap: Record<string, number> = {};
      seenData.forEach((row) => {
        countsMap[row.user_id] = (countsMap[row.user_id] || 0) + 1;
      });

      const countsArray = Object.entries(countsMap).map(([user_id, total]) => ({
        user_id,
        total,
      }));

      // 3️ Fetch profiles for these users
      const userIds = countsArray.map((row) => row.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds); //  now matches column name


      if (profilesError) throw profilesError;

      // 4️Merge counts with profiles
      let leaderboardData = countsArray
        .map((row) => {
          const profile = profilesData.find((p) => p.user_id === row.user_id);


          return {
            user_id: row.user_id,
            name: profile?.name ?? "Unknown",
            avatar: profile?.avatar_url ?? "/UsersAvatar.jpg",

            total: row.total,
          };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Ensure current user is visible even if not top 10
      if (!leaderboardData.some((u) => u.user_id === user.id)) {
        const myCount = countsMap[user.id] || 0;
        const myProfile = profilesData.find((p) => p.user_id === user.id);
        leaderboardData.push({
          user_id: user.id,
          name: myProfile?.name || "You",
          avatar: myProfile?.avatar_url || "/UsersAvatar.jpg",
          total: myCount,
        });
      }

      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    }
  };
  return (
    <>
      <PullToRefresh
        onRefresh={() => {
          setPage(0);
          return fetchQuestions(0).then((fresh) => {
            setQuestions(fresh);
            if (user) {
              localStorage.setItem(
                `feed_questions_${user.id}`,
                JSON.stringify(fresh)
              );
            }
          });
        }}
      >
        <div
          ref={scrollContainerRef}   // ✅ add this
          className="p-0 max-w-2xl mx-auto space-y-4
             h-[80vh] overflow-y-auto overflow-x-hidden
             custom-scrollbar"
        >


          <AnimatePresence>
            {feedbackMessage && (
              <motion.div
                className="fixed inset-0 z-[999] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Dark backdrop with click listener */}
                <div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setFeedbackMessage(null)} // ✅ close on outside click
                />

                {/* Message Card */}
                <motion.div
                  initial={{ scale: 0.6, y: 40 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="relative z-10 px-8 py-6 rounded-3xl
          bg-white dark:bg-gray-900
          shadow-2xl text-center max-w-sm w-[90%]"
                >
                  {/* Animated Feedback Emojis */}
                  <div className="w-full flex justify-center items-center">
                    {feedbackMessage.includes("🔥") && (
                      <img
                        src="https://em-content.zobj.net/source/animated-noto-color-emoji/356/fire_1f525.gif"
                        alt="fire"
                        style={{
                          width: "120px",
                          height: "120px"
                        }}
                      />
                    )}

                    {feedbackMessage.includes("🏆") && (
                      <img
                        src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif"
                        alt="trophy"
                        style={{
                          width: "120px",
                          height: "120px"
                        }}
                      />
                    )}

                    {feedbackMessage.includes("💬") && (
                      <img
                        src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.gif"
                        alt="hint"
                        style={{
                          width: "120px",
                          height: "120px"
                        }}
                      />
                    )}
                  </div>


                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {feedbackMessage}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/*  Reload Feed + Leaderboard + Reset Section */}
          <div className="flex flex-row flex-wrap justify-between items-center mt-4 gap-3">
            {/* Left side: Question count + two buttons */}
            <div className="flex flex-row flex-wrap items-center gap-3 w-full sm:w-auto">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Questions Tried: {questionCount}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="p-2 rounded-full active:scale-95 transition"
                    variant="ghost"
                    onClick={async () => {
                      // ✅ Detailed confirmation message
                      const confirmed = window.confirm(
                        "Are you absolutely sure you want to reset all your seen images? " +
                        "This action cannot be undone. Once reset, you will be able to see all " +
                        "images you have viewed before, as if you are seeing them for the first time. " +
                        "Your history of seen images will be completely cleared."
                      );
                      if (!confirmed) return; // Stop if user cancels

                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      try {
                        await supabase.from("seen_images").delete().eq("user_id", user.id);

                        const { data: newImages, error } = await supabase
                          .from("qfeed_images")
                          .select("*")
                          .order("created_at", { ascending: true });

                        if (error) {
                          console.error("Failed to reload images:", error);
                          alert("Failed to reload images.");
                          return;
                        }

                        setFeedImages(newImages);
                        alert("Reset complete! You can now see all images again.");
                      } catch (err) {
                        console.error("Reset images failed:", err);
                        alert("Failed to reset images. Check console for details.");
                      }
                    }}
                  >
                    <RotateCcw size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset images</p>
                </TooltipContent>
              </Tooltip>

              {/*  Reset My Seen Questions Button (mobile + desktop friendly) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="p-2 rounded-full  active:scale-95 transition"
                    variant="ghost"
                    onClick={async () => {
                      // ✅ Ask for confirmation
                      const confirmed = window.confirm(
                        "Are you sure you want to reset? This will clear all your history and cannot be undone. You will see all previously attempted questions again."
                      );
                      if (!confirmed) return; // Stop if user cancels

                      console.log("Starting reset...");
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        console.warn("No user found!");
                        alert("Please log in first!");
                        return;
                      }

                      try {
                        const { error } = await supabase
                          .from("qfeed_seen")
                          .delete()
                          .eq("user_id", user.id);

                        if (error) throw error;
                        console.log("qfeed_seen cleared for user:", user.id);

                        localStorage.removeItem(`feed_questions_${user.id}`);
                        localStorage.removeItem(`feed_answers_${user.id}`);
                        localStorage.removeItem(`feed_count_${user.id}`);
                        console.log("🧹 Local cache cleared.");

                        setQuestions([]);
                        setAnswers({});
                        setQuestionCount(0);
                        alert("All seen questions have been reset!");
                      } catch (err) {
                        console.error("Reset failed:", err);
                        alert("Failed to reset. Check console for details.");
                      }
                    }}
                  >
                    <Eraser size={20} />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Reset questions</p>
                </TooltipContent>
              </Tooltip>


              <Tooltip>
                <TooltipTrigger asChild>

                  <Button
                    className="p-2 rounded-full  active:scale-95 transition"
                    variant="ghost"

                    onClick={async () => {
                      if (navigator.vibrate) navigator.vibrate(50);

                      if (user) {
                        await loadLeaderboard();
                        setLeaderboardOpen(true);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 ">
                      <path stroke-linecap="round" stroke-linejoin="round" fill="#ffd413" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                    </svg>

                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Leaderboard</p>
                </TooltipContent>
              </Tooltip>

              {/* Right side: Reload Feed button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="p-2 rounded-full active:scale-95 transition flex items-center gap-1"
                    variant="ghost"
                    onClick={async () => {
                      if (navigator.vibrate) navigator.vibrate(50);

                      if (!user) return alert("Login first!");

                      setLoading(true); // start loading

                      setPage(0);
                      setQuestions([]);

                      try {
                        const fresh = await fetchQuestions(0, 50); // fetch 50 questions
                        setQuestions(fresh);

                        localStorage.setItem(
                          `feed_questions_${user.id}`,
                          JSON.stringify(fresh)
                        );
                      } catch (err) {
                        console.error("Failed to reload feed:", err);
                        alert("Failed to reload feed.");
                      } finally {
                        setLoading(false); // stop loading
                      }
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-1">
                        <svg
                          className="animate-spin h-4 w-4 text-gray-700"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span className="text-sm">Reload Feed</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Reload feed</p>
                </TooltipContent>
              </Tooltip>


            </div>


          </div>

          {questions.length === 0 &&
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

          {questions.map((q, index) => {
            const liked = q.qfeed_likes?.some((l) => l.user_id === user?.id);
            const selected = answers[q.id];
            const savedComments = JSON.parse(
              localStorage.getItem(`feed_comments_${user?.id}`) || "{}"
            );
            const commentCount =
              savedComments[q.id]?.length || q.comments_count || 0;

            const cards = [];

            // 🧠 Main question card — now fancy
            cards.push(
              <motion.div
                key={q.id}

                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative w-full max-w-screen-lg mx-auto mb-5"
                ref={index === questions.length - 1 ? loaderRef : null}

              >
                <Card className="relative bg-transparent dark:bg-transparent lg:bg-gray-100 lg:dark:bg-gray-900 border border-gray-300/60 dark:border-white/5 shadow-none rounded-xl overflow-visible transition-all">

                  {/* Confetti overlay */}
                  {selected === q.correct_answer && (
                    <>
                      <Confetti
                        width={loaderRef.current?.offsetWidth || 350}
                        height={loaderRef.current?.offsetHeight || 200}
                        recycle={false}
                        numberOfPieces={800}
                        gravity={0.6}
                        className="absolute top-0 left-0 pointer-events-none z-50"
                      />
                    </>
                  )}

                  <CardContent className="flex flex-col gap-3 p-5 w-full">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold text-blue-500 dark:text-blue-400 tracking-wide">
                        {q.quiz_title}
                      </p>
                    </div>

                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg leading-snug">
                      {q.question_text}
                    </p>

                    {/* Sound toggle */}
                    <div className="flex justify-end w-full mb-2">
                      <button
                        type="button"
                        onClick={() => setIsMuted((prev) => !prev)}
                        className="flex items-center gap-2 text-sm px-3 py-1 rounded-md border-none
               hover:bg-gray-200 dark:hover:bg-gray-700
               transition"
                      >
                        {isMuted ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>


                    {/* Options */}
                    <div className="flex flex-col gap-3 mt-3 w-full">
                      {["A", "B", "C", "D"].map((opt) => {
                        const text = q[`option_${opt.toLowerCase()}`];
                        if (!text) return null;
                        const chosen = selected === opt;
                        const correct = q.correct_answer === opt;
                        let circleColor = "bg-gray-400";
                        if (selected) {
                          if (correct && chosen) circleColor = "bg-green-500";
                          else if (!correct && chosen) circleColor = "bg-red-500";
                        }
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(50);

                              handleAnswer(q, opt);

                              // 🔊 Sound feedback (same logic as other page)
                              // Play sound only if not muted
                              if (!isMuted) {
                                playSound(correct ? "tap-correct" : "tap-wrong", false);
                              }

                              // ✅ VIBRATION
                              if (navigator.vibrate) {
                                if (correct) {
                                  // Short vibration for correct
                                  navigator.vibrate(50);
                                } else {
                                  // Stronger/longer vibration for wrong
                                  navigator.vibrate([100, 50, 100]); // vibrate 100ms, pause 50ms, vibrate 100ms
                                }
                              }

                            }}

                            disabled={!!selected}
                            className={`w-full flex items-start gap-3 px-3 py-2 text-left rounded-lg transition-all ${chosen
                              ? correct
                                ? "bg-green-100 dark:bg-green-800/40"
                                : "bg-red-100 dark:bg-red-800/40"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800/60"
                              }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ${circleColor}`}
                            ></span>
                            <div className="flex justify-between items-center w-full">
                              <div className="flex gap-2 break-words">
                                <span className="font-semibold">{opt}.</span>
                                <span className="break-words">{text}</span>
                              </div>

                              {/* Emoji reaction */}
                              {chosen && correct && (
                                <span className="ml-2 text-4xl animate-emoji-zoom">😊</span>
                              )}
                              {chosen && !correct && (
                                <span className="ml-2 text-4xl animate-emoji-zoom">😢</span>
                              )}
                            </div>

                          </button>
                        );
                      })}

                    </div>

                    {selected && (
                      <div className="mt-2">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Correct Answer: {q.correct_answer}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-snug">
                          {q.explanation}
                        </p>
                      </div>
                    )}

                    {/* Buttons row */}
                    <div className="flex gap-1 mt-4">
                      {/* Like Button with full red heart */}
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2 bg-transparent hover:bg-transparent"
                        onClick={() => {
                          toggleLike(q.id, liked);

                          // Play tap sound only on adding a like
                          if (!liked) {
                            playSound("tap-correct", false);
                          }
                        }}
                      >
                        {/* Heart icon */}
                        <span className="transition-transform duration-200 hover:scale-110 flex items-center">
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ width: "24px", height: "24px" }} // ✅ control size
                          >
                            <title>Heart</title>
                            <path
                              fill={liked ? "#FF0000" : "#CCCCCC"} // full red if liked, gray if not
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            />
                          </svg>
                        </span>

                        {/* Like count */}
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{q.qfeed_likes?.length || 0}</span>
                      </Button>

                      {/* Comment Button with LiveChat SVG */}
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2 bg-transparent hover:bg-transparent"
                        onClick={() => loadComments(q.id)}
                      >
                        <span className="transition-transform duration-200 hover:scale-110 flex items-center">
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ width: "24px", height: "24px" }} // ✅ pixel control
                          >
                            <title>LiveChat</title>
                            <path
                              fill="#FF5100"
                              d="M23.849 14.91c-.24 2.94-2.73 5.22-5.7 5.19h-3.15l-6 3.9v-3.9l6-3.9h3.15c.93.03 1.71-.66 1.83-1.59.18-3 .18-6-.06-9-.06-.84-.75-1.47-1.56-1.53-2.04-.09-4.2-.18-6.36-.18s-4.32.06-6.36.21c-.84.06-1.5.69-1.56 1.53-.21 3-.24 6-.06 9 .09.93.9 1.59 1.83 1.56h3.15v3.9h-3.15a5.644 5.644 0 01-5.7-5.19c-.21-3.21-.18-6.39.06-9.6a5.57 5.57 0 015.19-5.1c2.1-.15 4.35-.21 6.6-.21s4.5.06 6.63.24a5.57 5.57 0 015.19 5.1c.21 3.18.24 6.39.03 9.57z"
                            />
                          </svg>
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{commentCount}</span>
                      </Button>



                      {/* Share Button */}
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2 bg-transparent hover:bg-transparent text-gray-800 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-200"

                        onClick={() => {
                          if (!user) {
                            alert("Please log in to share!");
                            return;
                          }

                          const siteLink = window.location.origin;
                          const questionText = q.question_text;
                          const correctAnswer = q.correct_answer;

                          const prefilledMessage = encodeURIComponent(
                            `Hey! Have you checked out this website? It has great questions for NCK, KMTC revision, and nursing. Here's one:\n\nQuestion: ${questionText}\nAnswer: ${correctAnswer}\n\nExplore more here: ${siteLink}`
                          );

                          // Open WhatsApp with prefilled message
                          const whatsappURL = `https://wa.me/?text=${prefilledMessage}`;
                          window.open(whatsappURL, "_blank");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ width: "24px", height: "24px" }} // ✅ pixel control
                          >
                            <title>WhatsApp</title>
                            <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span className="hidden md:inline text-[10px]">WhatsApp</span>

                          {/* smaller */}
                        </div>

                      </Button>
                      {/* Facebook Share Button */}
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2 bg-transparent hover:bg-transparent text-gray-800 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-200"
                        onClick={() => {
                          if (!user) {
                            alert("Please log in to share!");
                            return;
                          }

                          const siteLink = window.location.origin;
                          const questionText = q.question_text;
                          const correctAnswer = q.correct_answer;

                          // Facebook share link prefilled with text via query params
                          const facebookURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            siteLink
                          )}&quote=${encodeURIComponent(
                            `Hey! Check out this question:\n\nQuestion: ${questionText}\nAnswer: ${correctAnswer}`
                          )}`;

                          window.open(facebookURL, "_blank");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ width: "24px", height: "24px" }}
                          >
                            <title>Facebook</title>
                            <path
                              fill="#1877F2"
                              d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
                            />
                          </svg>
                          <span className="hidden md:inline text-[10px]">Facebook</span> {/* smaller text */}
                        </div>
                      </Button>
                      {/* Telegram Share Button */}
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2 bg-transparent hover:bg-transparent text-gray-800 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-200"
                        onClick={() => {
                          if (!user) {
                            alert("Please log in to share!");
                            return;
                          }

                          const siteLink = window.location.origin;
                          const questionText = q.question_text;
                          const correctAnswer = q.correct_answer;

                          // Telegram share link with prefilled message
                          const telegramURL = `https://t.me/share/url?url=${encodeURIComponent(
                            siteLink
                          )}&text=${encodeURIComponent(
                            `Hey! Check out this question:\n\nQuestion: ${questionText}\nAnswer: ${correctAnswer}`
                          )}`;

                          window.open(telegramURL, "_blank");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {/* Telegram Icon */}
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ width: "24px", height: "24px" }}
                          >
                            <title>Telegram</title>
                            <path
                              fill="#26A5E4"
                              d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
                            />
                          </svg>
                          {/* Only show label on medium+ screens */}
                          <span className="hidden md:inline text-[10px]">Telegram</span>
                        </div>
                      </Button>

                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            );
            // 🔽 Show Load More ONLY after every 10 questions
            if (
              (index + 1) % 10 === 0 &&
              hasMore &&
              index === questions.length - 1
            ) {
              cards.push(
                <div key={`load-more-${index}`} className="flex justify-center py-6">


                </div>
              );
            }

            // 🖼️ Fancy image card + delete option + upload always last
            if ((index + 1) % 4 === 0 && feedImages?.length > 0) {

              // updated: show exactly ONE image after every 2 questions
              if (feedImages?.length > 0) {
                // pick which image to show for this insertion spot:
                // imagePosition = 0 for first image spot (after question 2),
                // 1 for second image spot (after question 4), etc.
                const imagePosition = Math.floor((index + 1) / 2) - 1;
                // wrap around if there are fewer images than spots
                const img = feedImages[imagePosition % feedImages.length];



                // push single image card
                cards.push(
                  <motion.div
                    key={`image-${img.id}`}
                    whileHover={{ scale: 1 }}
                    className="w-full max-w-screen-lg mx-auto mb-6"
                  >
                    <Card className="overflow-hidden bg-transparent border-0 shadow-none relative">

                      {/* updated: educational inspiration banner */}
                      <div className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white text-center py-2 text-sm  font-medium">
                        Visuals to enhance your knowledge and make learning memorable.
                      </div>
                      {/* uploader info */}
                      <div className="flex items-center gap-3 p-3">
                        <img
                          src={img.profiles?.avatar_url || "/UsersAvatar.jpg"}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover border"
                        />

                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
                            {img.profiles?.name || "Unknown User"}
                          </span>

                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Shared this image
                          </span>
                        </div>
                      </div>
                      <div className="relative w-full h-[420px] sm:h-[520px] bg-black flex items-center justify-center overflow-hidden">
                        {/* Show loader while image is loading */}
                        {!loadedImages[img.id] && (
                          <div className="absolute inset-0 flex items-center justify-center scale-[0.45]">
                            <GlobalLoader />
                          </div>
                        )}

                        {/* Image */}
                        <img
                          src={img.image_url}
                          alt={img.title || "Feed image"}
                          onLoad={() => setLoadedImages((prev) => ({ ...prev, [img.id]: true }))}
                          onClick={async () => {
                            openViewer(img);

                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            const { error } = await supabase.from("seen_images").insert({
                              user_id: user.id,
                              image_id: img.id,
                            });

                            if (!error) {
                              setFeedImages((prev) => prev.filter((i) => i.id !== img.id));
                            }
                          }}
                          className={`w-full h-full object-contain cursor-pointer transition-opacity duration-500 ${loadedImages[img.id] ? "opacity-100" : "opacity-0"
                            }`}
                        />
                      </div>

                      {img.added_by === user?.id && (
                        <button
                          onClick={() => handleDeleteImage(img)}
                          className="absolute top-3 right-3 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full transition-all"
                          title="Delete Image"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}

                      {img.description && (
                        <p className="p-3 text-center text-sm text-gray-700 dark:text-gray-300">
                          {img.description}
                        </p>
                      )}

                    </Card>
                  </motion.div>
                );
              }
              // 🌌 Compact, working + preview upload card
              cards.push(
                <motion.div
                  key="upload-card"
                  className="relative flex flex-col items-center justify-center p-4 sm:p-6 w-full bg-transparent mt-4"

                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  {/* ✨ Subtle rotating glow */}
                  <motion.div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.04)_0%,_transparent_70%)] dark:bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12)_0%,_transparent_70%)]"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
                  />

                  {/* 🌠 Floating stars */}
                  {[...Array(12)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-gray-400 dark:bg-white opacity-60"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2 + Math.random() * 2,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}

                  {/* 🌌 Upload dropdown with thin trigger line // updated */}
                  <div className="relative z-10 w-full flex flex-col items-center text-center">
                    {/* Thin line button */}
                    <button
                      onClick={() => setShowUpload((prev) => !prev)} // updated
                      className="text-gray-800 dark:text-gray-200 text-sm pb-1 hover:underline"
                    >
                      {showUpload ? "Hide Upload ▲" : "Upload Image ▼"}
                    </button>
                    {/* Dropdown upload card */}
                    {showUpload && (
                      <div className="mt-3 flex flex-col items-center justify-center text-center w-full sm:w-auto p-4 sm:p-5 bg-transparent"
                      >
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full">
                          {uploadFiles && uploadFiles.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                              {uploadFiles.map((file, index) => (
                                <img
                                  key={index}
                                  src={URL.createObjectURL(file)}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-40 sm:h-48 object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-start w-full">
                              <span className="text-gray-700 dark:text-gray-300 font-medium text-xs sm:text-sm">
                                Tap or click to choose images
                              </span>
                            </div>

                          )}

                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            multiple // ✅ enable multiple file selection
                            className="hidden"
                            onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                          />
                        </label>

                        {/* Upload button */}
                        <div className="relative w-full flex flex-col items-start">

                          {/* Upload button */}
                          <Button
                            onClick={handleImageUpload}
                            disabled={uploading || uploadFiles.length === 0}
                            variant="ghost"
                            className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {uploading ? (
                              <>
                                <svg
                                  className="animate-spin w-5 h-5 text-gray-700 dark:text-gray-200"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                  ></path>
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>


                        {/* Subtitle */}
                        <p className="mt-2 text-gray-600 dark:text-gray-400 text-xs sm:text-sm text-left w-full">
                          Share your photos & inspire others
                        </p>

                      </div>
                    )}
                  </div>



                </motion.div>);
            }
            return cards;
          })}
          <Button
            onClick={() => {
              // Vibrate 60ms
              if (navigator.vibrate) navigator.vibrate(60);

              // Original loadMore function
              loadMore();
            }}
            disabled={loading}
            className="
    px-8 py-3
    text-base font-semibold
    rounded-full
    bg-blue-600 hover:bg-blue-700
    text-white
    shadow-md
    transition
    flex items-center gap-2
  "
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                    className="opacity-75"
                  />
                </svg>
                Loading more…
              </>
            ) : (
              "Load more questions"
            )}
          </Button>
          <AnimatePresence>
            {viewerOpen && activeImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md"
                onClick={closeViewer}
              >
                <motion.img
                  key={activeImage.id}
                  src={activeImage.image_url}
                  alt={activeImage.title || "Image"}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-[90%] max-h-[80vh] object-contain rounded-xl shadow-lg"
                />
                {/* description */}
                {activeImage.description && (
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-gray-200 text-sm mt-4 text-center max-w-xl px-4"
                  >
                    {activeImage.description}
                  </motion.p>
                )}

                {/* delete button (only if uploader) */}
                {activeImage.added_by === user?.id && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation(); // prevent closing viewer
                      handleDeleteImage(activeImage);
                      closeViewer();
                    }}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    variant="ghost"
                    className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                )}

                {/* close button */}
                <motion.button
                  onClick={closeViewer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-5 right-5 text-white bg-black/40 hover:bg-black/70 p-3 rounded-full"
                >
                  <X size={24} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            ref={loaderRef}
            className="flex flex-col items-center justify-center py-4 w-full"
          >
            {/* infinite scroll observer only – no skeleton UI */}
          </div>

          {/* 💬 Comments Modal */}
          <Dialog
            open={!!activeQuestion}
            onOpenChange={() => setActiveQuestion(null)}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Comments
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto scrollbar scrollbar-thumb-gray-500/40 dark:scrollbar-thumb-gray-400/50 scrollbar-track-transparent">

                {comments.map((c) => {
                  const isReply = !!c.parent_id;
                  const liked = c.comment_likes?.some(
                    (l) => l.user_id === user?.id
                  );
                  return (
                    <div
                      key={c.id}
                      className={`flex items-start gap-3 ${isReply ? "ml-8" : ""
                        }`}
                    >
                      <img
                        src={c.profiles?.avatar_url || "/UsersAvatar.jpg"}
                        alt={c.profiles?.name || "User"}
                        className="w-8 h-8 rounded-full"
                      />

                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {c.profiles?.name || "User"}
                        </p>

                        <p className="text-gray-700 dark:text-gray-300">
                          {c.comment_text}
                        </p>
                        <div className="flex gap-3 text-xs mt-1 text-gray-500 dark:text-gray-400">
                          <button
                            className="flex items-center gap-1"
                            onClick={() => setReplyTo(c.id)}
                          >
                            <Reply size={14} /> Reply
                          </button>
                          <button
                            className="flex items-center gap-1"
                            onClick={() => toggleCommentLike(c.id)}
                          >
                            {liked ? "❤️" : <ThumbsUp size={14} />}{" "}
                            {c.comment_likes?.length || 0}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-3">
                <Input
                  placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button onClick={addComment}>Post</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 🏆 Leaderboard Modal */}
          <Dialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
            <DialogContent
              className="max-w-full sm:max-w-md p-4"
              aria-describedby="leaderboard-desc"
            >
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-center">
                  Leaderboard
                </DialogTitle>
              </DialogHeader>

              <div
                id="leaderboard-desc"
                className="overflow-y-auto scrollbar scrollbar-thumb-gray-500/40 dark:scrollbar-thumb-gray-400/50 scrollbar-track-transparent">


                <AnimatePresence>
                  {Object.values(
                    leaderboard.reduce((acc: Record<number, typeof leaderboard>, entry) => {
                      if (!acc[entry.total]) acc[entry.total] = [];
                      acc[entry.total].push(entry);
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[0].total - a[0].total)
                    .map((batch, batchIndex) => (
                      <div key={batchIndex} className="space-y-2">
                        {batch.map((entry) => {
                          const position = leaderboard.indexOf(entry) + 1;

                          let badge = null;
                          if (position === 1) badge = { stars: 5, label: "Gold" };
                          else if (position === 2) badge = { stars: 4, label: "Diamond" };
                          else if (position === 3) badge = { stars: 3, label: "Silver" };
                          else if (position === 4) badge = { stars: 2, label: "Bronze" };

                          return (
                            <motion.div
                              key={entry.user_id}
                              layout
                              initial={{ opacity: 0, y: -20, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 20, scale: 0.95 }}
                              transition={{ duration: 0.5 }}
                              className="flex flex-wrap sm:flex-nowrap sm:items-center gap-2 sm:gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800"
                            >
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-lg font-bold">{position}</span>
                                <motion.img
                                  src={entry.avatar || "/UsersAvatar.jpg"}
                                  alt={entry.name}
                                  className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex-shrink-0"
                                  layout
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                />
                              </div>

                              <span className="flex-1 font-medium text-gray-900 dark:text-gray-100 break-words min-w-0">
                                {entry.name || "Unknown"}
                              </span>

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-500">{entry.total} Qs</span>
                                {badge && (
                                  <span className="flex items-center gap-1 text-xs font-semibold flex-wrap">
                                    {Array.from({ length: badge.stars }).map((_, i) => (
                                      <motion.svg
                                        key={i}
                                        className="w-3 h-3 text-yellow-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                          delay: i * 0.05,
                                          type: "spring",
                                          stiffness: 300,
                                        }}
                                      >
                                        <path d="M10 1l2.39 4.85L18 6.5l-3.9 3.8.92 5.38L10 13.77 5.98 15.68l.92-5.38L3 6.5l5.61-.65L10 1z" />
                                      </motion.svg>
                                    ))}
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                </AnimatePresence>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {uploading && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-white">
            <svg
              className="animate-spin w-12 h-12 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <p className="text-lg font-semibold text-center mb-4">
              Uploading images…<br />
              Do not leave the page or close the browser.
            </p>
            <button
              onClick={() => {
                // Abort all ongoing uploads
                uploadControllers.current.forEach((c) => c.abort());
                setUploading(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Leave
            </button>
          </div>
        )}


      </PullToRefresh >
    </>
  );
}

