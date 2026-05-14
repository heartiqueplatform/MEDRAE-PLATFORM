"use client";
import PullToRefresh from "react-simple-pull-to-refresh";
import { TermsButton } from "@/components/ui/TermsButton";
import { useWindowSize } from "react-use";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Volume2, VolumeX, RotateCcw, Eraser, Trophy, RefreshCcw, ArrowUp, Upload, Star, Heart, MessageCircle, Reply, ThumbsUp, ThumbsDown } from "lucide-react";
import FeedMediaPanel from "@/components/Feed/FeedMediaPanel";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CommentsModal from "@/components/Feed/CommentsModal";
import FeedControls from "@/components/Feed/FeedControls";
import { playSound } from "@/lib/soundManager";
import { useSession } from "@supabase/auth-helpers-react";
import { MicroCaseCard } from "@/components/MicroCaseCard";
import ShareButtonsGroup from "@/components/Share/ShareButtonsGroup";
import confetti from "canvas-confetti";
const safeParse = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

// Skeleton loader
const SkeletonCard = () => (
  <div className="animate-pulse border-0 rounded-xl p-4 bg-muted/20">
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
  const session = useSession();
  const userId = session?.user?.id;
  // ✅ Feedback Power-Up tracking
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [voteStats, setVoteStats] = useState({});
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
  const [knowledgeData, setKnowledgeData] = useState<any[]>([]);
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

  useEffect(() => {
    // Subscribe to qfeed_seen table updates
    const subscription = supabase
      .channel("public:qfeed_seen")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qfeed_seen" },
        (payload) => {
          const row = payload.new;
          // Update voteStats state for this question
          setVoteStats((prev) => {
            const prevCounts = prev[row.question_id] || { A: 0, B: 0, C: 0, D: 0 };
            const updatedCounts = { ...prevCounts };
            if (row.selected_option && updatedCounts[row.selected_option] !== undefined) {
              updatedCounts[row.selected_option] += 1;
            }
            return {
              ...prev,
              [row.question_id]: updatedCounts
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);
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

  const uploadToCloudinary = async (file) => {
    const cloudName = "dpj5vprwf"; // 👈 CHANGE THIS
    const uploadPreset = "js1gxxdv"; // 👈 CHANGE THIS (The Unsigned one)

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message);
    }

    const data = await response.json();
    return data.secure_url; // This is the URL we need
  };
  const handleImageUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0 || !user)
      return alert("Select one or more images first.");

    setUploading(true);
    // Keep your controller logic if you use it for the UI state
    uploadControllers.current = [];

    try {
      const uploadedImages = [];

      for (const file of uploadFiles) {
        // 1️⃣ UPLOAD TO CLOUDINARY (Replacing Supabase Storage)
        // We get the direct URL back immediately
        const cloudinaryUrl = await uploadToCloudinary(file);

        // 2️⃣ INSERT RECORD INTO DATABASE
        // We use the same table, but save the Cloudinary URL
        const { error: insertError, data: insertedData } = await supabase
          .from("qfeed_images")
          .insert({
            image_url: cloudinaryUrl, // 👈 Saved Cloudinary URL
            storage_path: "cloudinary", // 👈 We can just put a placeholder here now
            added_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        uploadedImages.push(insertedData);
      }

      // Keep your existing state updates so the UI reflects the new post
      setFeedImages((prev) => [...uploadedImages, ...prev]);
      setUploadFiles([]);
      alert("Images uploaded via Cloudinary! Bandwidth saved.");
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      uploadControllers.current = [];
    }
  };


  const fetchKnowledge = async () => {
    const { data, error } = await supabase
      .from('qfeed_knowledge')
      .select('*, profiles(name, avatar_url)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setKnowledgeData(data);
    }
  };

  // Make sure this runs when the page loads
  useEffect(() => {
    fetchKnowledge();
    // ... your other fetch functions
  }, []);
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
          localStorage.setItem(`feed_count_${user.id}`, count.toString());
        }
      } catch (err) {
        console.error("❌ Failed loading question count:", err);
      }
    };
    loadCount();
  }, [user]);
  useEffect(() => {
    // ✅ Correct streak rewards (3 → Great, 5 → Outstanding)
    if (correctStreak > 0 && correctStreak % 5 === 0) {
      setFeedbackMessage(
        "🏆 Outstanding work! Reaching this streak shows excellent focus and consistency. Keep up the great momentum—you’re making impressive progress."
      );

      playSound("trivia-finish"); // 🔊 sound for big milestone
    } else if (correctStreak > 0 && correctStreak % 3 === 0) {
      setFeedbackMessage(
        "🔥 Great job! Your effort is clearly paying off. Each correct answer strengthens your understanding—keep going."
      );

      playSound("medrae"); // 🔊 sound for medium milestone
    }

    // ✅ Wrong streak encouragement (every 3)
    if (wrongStreak > 0 && wrongStreak % 3 === 0) {
      setFeedbackMessage(
        "💬 Take a moment to review the concept and consider the hint provided. Learning takes practice, and every attempt brings you closer to mastering the topic."
      );

      playSound("alert-sound"); // 🔊 sound for warning/encouragement
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


  useEffect(() => {
    const loadImages = async () => {
      if (!userId) return; // user not logged in

      try {
        // 1️⃣ Get all images with uploader info
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

        // 2️⃣ Get all images the user has already seen
        const { data: seen, error: seenErr } = await supabase
          .from("seen_images")
          .select("image_id")
          .eq("user_id", userId);

        if (seenErr) throw seenErr;

        // 3️⃣ Filter out seen images
        const seenIds = seen.map(row => row.image_id);
        const unseenImages = images.filter(img => !seenIds.includes(img.id));

        // 4️⃣ Update state
        setFeedImages(unseenImages);

      } catch (err) {
        console.error("❌ Error loading images:", err);
      }
    };

    loadImages();
    // Optional: you can call loadImages() manually after new uploads or marking images as seen
  }, [userId]); // refetch if userId changes

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

      // 🚀 FETCH FRESH QUESTIONS IN BACKGROUND
      const INITIAL_LIMIT = 10;
      fetchQuestions(0, INITIAL_LIMIT).then((fresh) => {
        if (!fresh || fresh.length === 0) return;

        // Merge with cached without overwriting
        setQuestions((prev) => {
          const ids = new Set(prev.map((q) => q.id));
          return [...prev, ...fresh.filter((q) => !ids.has(q.id))];
        });

        // Save fresh questions to localStorage
        localStorage.setItem(
          storageKey,
          JSON.stringify({ questions: fresh, lastSaved: Date.now() })
        );

        // Enrich questions in background
        enrichQuestions(fresh).then((enriched) => {
          setQuestions((prev) => {
            const map = new Map(prev.map((q) => [q.id, q]));
            enriched.forEach((q) => map.set(q.id, q));
            return Array.from(map.values());
          });
        });
      });
    };

    init();

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);



  // Replace fetchQuestions
  const fetchQuestions = async (page = 0, limit = 25) => {
    if (!userId) return []; // user not logged in

    try {
      // Get already seen question IDs
      const { data: seenData, error: seenError } = await supabase
        .from("qfeed_seen")
        .select("question_id")
        .eq("user_id", userId);

      if (seenError) {
        console.error("Seen fetch error:", seenError);
        return [];
      }

      const seenList = seenData?.map(s => s.question_id) || [];

      // Fetch questions excluding seen ones
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select(
          "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation"
        )
        .not(
          "id",
          "in",
          `(${seenList.join(",") || "00000000-0000-0000-0000-000000000000"})`
        )
        .range(page * limit, page * limit + limit - 1);

      if (questionsError) {
        console.error("Questions fetch error:", questionsError);
        return [];
      }

      if (!questions?.length) return [];

      // Shuffle
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const ids = shuffled.map(q => q.id);
      const quizIds = [...new Set(shuffled.map(q => q.quiz_id))];

      // Fetch likes, comments, quizzes in parallel
      const [{ data: likes }, { data: commentsData }, { data: quizzes }] =
        await Promise.all([
          supabase.from("qfeed_likes").select("question_id, user_id").in("question_id", ids),
          supabase.from("qfeed_comments").select("id, question_id").in("question_id", ids),
          supabase.from("quizzes").select("id, title").in("id", quizIds),
        ]);

      // Map for likes
      const likesMap = new Map<string, any[]>();
      likes?.forEach(l => {
        if (!likesMap.has(l.question_id)) likesMap.set(l.question_id, []);
        likesMap.get(l.question_id)!.push(l);
      });

      // Map for comments count
      const commentsCountMap = new Map<string, number>();
      commentsData?.forEach(c => {
        commentsCountMap.set(c.question_id, (commentsCountMap.get(c.question_id) || 0) + 1);
      });

      // Map for quiz titles
      const quizTitleMap = new Map<string, string>();
      quizzes?.forEach(q => quizTitleMap.set(q.id, q.title));

      // Merge and return
      return shuffled.map(q => ({
        ...q,
        qfeed_likes: likesMap.get(q.id) || [],
        comments_count: commentsCountMap.get(q.id) || 0,
        quiz_title: quizTitleMap.get(q.quiz_id) || "Untitled Quiz",
      }));
    } catch (err) {
      console.error("❌ Error fetching questions:", err);
      return [];
    }
  };

  // Infinite scroll loader
  const loadMore = async () => {
    if (loading || !userId || !hasMore) return;

    setLoading(true);
    const batchSize = 10;
    const nextPage = page + 1;

    const newData = await fetchQuestions(nextPage, batchSize);

    if (newData && newData.length > 0) {
      const existingIds = new Set(questions.map(q => q.id));
      const filtered = newData.filter(q => !existingIds.has(q.id));

      setQuestions(prev => [...prev, ...filtered]);
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
  const fireConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      startVelocity: 60,
      origin: { y: 0.7 },
    });

    // optional second burst (makes it feel powerful)
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        startVelocity: 50,
        origin: { x: 0.3, y: 0.7 },
      });
      confetti({
        particleCount: 80,
        spread: 100,
        startVelocity: 50,
        origin: { x: 0.7, y: 0.7 },
      });
    }, 150);
  };
  // Answer a question - now removes it completely
  const handleAnswer = async (q, option) => {
    // 1. Prevent double-answering
    if (answers[q.id]) return;

    const isCorrect = q.correct_answer === option;

    // 2. Play Sound (Only if NOT muted)
    if (!isMuted) {
      playSound(isCorrect ? "tap-correct" : "tap-wrong", false);
    }

    // 3. Haptic Feedback (Vibration)
    if (navigator.vibrate) {
      isCorrect ? navigator.vibrate(50) : navigator.vibrate([100, 50, 100]);
    }

    // 4. Update UI State immediately
    setAnswers((prev) => ({ ...prev, [q.id]: option }));

    if (isCorrect) {
      setCorrectStreak((prev) => prev + 1);
      setWrongStreak(0);
      fireConfetti();
    } else {
      setWrongStreak((prev) => prev + 1);
      setCorrectStreak(0);
    }

    // 5. SAVE TO DATABASE
    // We use .upsert with onConflict to prevent the 400 "Bad Request" error.
    // Note: Ensure you ran the SQL: ALTER TABLE qfeed_seen ADD CONSTRAINT qfeed_seen_user_question_unique UNIQUE (user_id, question_id);
    await supabase.from("qfeed_seen").upsert({
      question_id: q.id,
      user_id: user.id,
      selected_option: option
    }, { onConflict: 'user_id,question_id' });

    // 6. Update Question Count
    setQuestionCount((prev) => {
      const newCount = prev + 1;
      localStorage.setItem(`feed_count_${user.id}`, newCount.toString());
      return newCount;
    });

    // 7. Fetch updated vote counts for the bars
    const counts = await fetchVoteStats(q.id);
    if (counts) {
      setVoteStats((prev) => ({ ...prev, [q.id]: counts }));
    }

    // 8. UPDATE LOCAL STORAGE CACHE
    const storageKey = `feed_questions_${user.id}`;
    const rawCache = localStorage.getItem(storageKey);

    if (rawCache) {
      try {
        const parsedCache = JSON.parse(rawCache);

        // If cache is the object format: { questions: [...], lastSaved: ... }
        if (parsedCache.questions) {
          parsedCache.questions = parsedCache.questions.filter(item => item.id !== q.id);
          localStorage.setItem(storageKey, JSON.stringify(parsedCache));
        }
        // If cache is just a flat array: [...]
        else if (Array.isArray(parsedCache)) {
          const filtered = parsedCache.filter(item => item.id !== q.id);
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      } catch (err) {
        console.error("Error updating local cache:", err);
      }
    }
  };

  const fetchVoteStats = async (questionId) => {
    const { data, error } = await supabase
      .from("qfeed_seen")
      .select("selected_option")
      .eq("question_id", questionId);

    if (error) {
      console.error("Error loading vote stats:", error);
      return null;
    }

    // Count votes
    const counts = { A: 0, B: 0, C: 0, D: 0 };

    data.forEach((row) => {
      if (counts[row.selected_option] !== undefined) {
        counts[row.selected_option]++;
      }
    });

    return counts;
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
        "id, comment_text, created_at, user_id, parent_id, profiles!user_id(name, avatar_url)"
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
        // UPDATE THIS LINE BELOW:
        .select(`
        id,
        comment_text,
        created_at,
        user_id,
        parent_id,
        profiles:user_id(name, avatar_url)
      `)
        .single();

      setNewComment("");
      setReplyTo(null);

      // Update question comment count
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === activeQuestion
            ? { ...q, comments_count: (q.comments_count || 0) + 1 }
            : q
        )
      );

      // Update comments state
      setComments((prev) => {
        // Now 'inserted' includes the 'profiles' object!
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
      console.error("Error adding comment:", err);
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
          className="p-0 max-w-2xl mx-auto space-y-2
             h-[80vh] overflow-y-auto overflow-x-hidden
             custom-scrollbar  "
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
          <FeedControls
            questionCount={questionCount}
            session={session}
            supabase={supabase}
            setFeedImages={setFeedImages}
            setQuestions={setQuestions}
            setAnswers={setAnswers}
            setQuestionCount={setQuestionCount}
            fetchQuestions={fetchQuestions}
            user={user}
            loading={loading}
            setLoading={setLoading}
            setPage={setPage}
          />

          {loading && questions.length === 0 && (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          )}

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
                <Card className="relative bg-transparent dark:bg-transparent lg:bg-gray-100 lg:dark:bg-gray-900 border-0 shadow-none rounded-xl overflow-visible transition-all">

                  {/* Confetti overlay */}
                  {selected === q.correct_answer && (
                    <>

                    </>
                  )}

                  <CardContent className="flex flex-col gap-2 p-2 w-full">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold text-blue-500 dark:text-blue-400 tracking-wide">
                        {q.quiz_title}
                      </p>
                    </div>

                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg leading-snug">
                      {q.question_text}
                    </p>

                    {/* Sound toggle */}
                    <div className="flex justify-end w-full mb-0">
                      <button
                        type="button"
                        onClick={() => setIsMuted((prev) => !prev)}
                        className="flex items-center gap-2 text-sm px-3 py-1 rounded-md border-none
               hover:bg-gray-200 dark:hover:bg-gray-700
               transition"
                      >
                        {isMuted ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>


                    {/* Options */}
                    <div className="flex flex-col gap-2 mt-0 w-full">
                      {["A", "B", "C", "D"].map((opt) => {
                        const text = q[`option_${opt.toLowerCase()}`];
                        if (!text) return null;
                        const chosen = selected === opt;
                        const correct = q.correct_answer === opt;
                        const stats = voteStats[q.id] || { A: 0, B: 0, C: 0, D: 0 };

                        const totalVotes =
                          stats.A + stats.B + stats.C + stats.D;

                        const percent =
                          totalVotes > 0
                            ? Math.round((stats[opt] / totalVotes) * 100)
                            : 0;
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

                              if (!isMuted) {
                                playSound(correct ? "tap-correct" : "tap-wrong", false);
                              }

                              if (navigator.vibrate) {
                                if (correct) {
                                  navigator.vibrate(50);
                                } else {
                                  navigator.vibrate([100, 50, 100]);
                                }
                              }
                            }}
                            disabled={!!selected}
                            className={`relative w-full flex items-start gap-3 px-3 py-2 text-left rounded-lg transition-all overflow-hidden ${chosen
                              ? correct
                                ? "bg-green-100 dark:bg-green-800/40"
                                : "bg-red-100 dark:bg-red-800/40"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800/60"
                              }`}
                          >

                            {/* Vote percentage bar */}
                            {selected && (
                              <div
                                className="absolute left-0 top-0 h-full bg-blue-500/30 dark:bg-blue-500/30 transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            )}

                            <span
                              className={`relative z-10 w-4 h-4 rounded-full mt-1 flex-shrink-0 ${circleColor}`}
                            ></span>

                            <div className="relative z-10 flex justify-between items-center w-full">
                              <div className="flex gap-2 break-words items-center">
                                <span className="font-semibold">{opt}.</span>
                                <span className="break-words">{text}</span>

                                {/* Vote percentage */}
                                {selected && totalVotes > 0 && (
                                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {percent}% chose this
                                  </span>
                                )}
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
                      <div className="mt-2 p-2 rounded-2xl
                  bg-gradient-to-br from-indigo-800 via-purple-700 to-pink-700
                  dark:from-indigo-700 dark:via-purple-600 dark:to-pink-600
                  shadow-2xl border-0
                  relative overflow-hidden transition-all duration-500">

                        {/* Strong readability overlay */}
                        <div className="absolute inset-0 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-2xl pointer-events-none"></div>

                        <div className="relative z-10">
                          <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center drop-shadow-md">
                            <span className="w-5 h-5 mr-2 rounded-full bg-emerald-700 dark:bg-emerald-400 animate-pulse"></span>
                            Correct Answer: {q.correct_answer}
                          </p>

                          <p className="text-gray-900 dark:text-gray-200 text-lg leading-relaxed border-0  italic drop-shadow-sm">
                            {q.explanation}
                          </p>
                        </div>
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
                    </div>
                    {(index + 1) % 10 === 0 && (
                      <ShareButtonsGroup
                        user={user}
                        q={{
                          question_text: q.question_text,
                          correct_answer: q.correct_answer,
                        }}
                      />
                    )}
                  </CardContent>
                  <MicroCaseCard />
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
            if ((index + 1) % 4 === 0 && feedImages?.length > 0) {
              cards.push(
                <FeedMediaPanel
                  key={`feed-media-${index}`}

                  index={index}
                  knowledgePosts={knowledgeData}
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
                />
              );
            }
            return cards;
          })}
          {hasMore && (
            <div className="flex flex-col items-center justify-center py-12 w-full">
              <AnimatePresence mode="wait">
                {!loading ? (
                  <motion.button
                    key="load-button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(60);
                      loadMore();
                    }}
                    className="
            group relative flex items-center gap-3 px-8 py-4
            bg-white dark:bg-gray-800
            text-blue-600 dark:text-blue-400
            font-bold rounded-full
            shadow-[0_4px_20px_rgba(0,0,0,0.1)]
            hover:shadow-[0_8px_30px_rgba(37,99,235,0.2)]
            border border-blue-100 dark:border-gray-700
            transition-all duration-300
          "
                  >
                    <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="tracking-wide">Explore More</span>

                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="relative flex items-center justify-center"
                  >
                    {/* The Outer Rotating Ring */}
                    <div className="w-16 h-16 border-4 border-blue-100 dark:border-gray-800 rounded-full" />
                    <motion.div
                      className="absolute w-16 h-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    />

                    {/* The Inner Pulsing Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
                      </motion.div>
                    </div>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-8 text-xs font-medium text-blue-600 uppercase tracking-widest whitespace-nowrap"
                    >
                      Curating Feed...
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <TermsButton />
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
          />
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
        </div>
      </PullToRefresh >
    </>
  );
}

