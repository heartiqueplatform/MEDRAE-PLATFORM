"use client";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useWindowSize } from "react-use";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Volume2, VolumeX, RotateCcw, Eraser, Trophy, RefreshCcw, ArrowUp, Upload } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"; // added
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Reply, ThumbsUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  <div className="animate-pulse p-4 border rounded-xl space-y-3">
    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
    <div className="w-full h-4 bg-gray-300 dark:bg-gray-700 rounded mt-3"></div>
    <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded mt-2"></div>
  </div>
);

export default function Feed() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const { width, height } = useWindowSize();

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

    try {
      const uploadedImages = [];

      // Loop through all selected images
      for (const file of uploadFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`; // ✅ store inside user folder

        // 1️⃣ Upload to storage with folder path
        const { error: uploadError } = await supabase.storage
          .from("qfeed-images")
          .upload(filePath, file);

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

      // 4️⃣ Update UI once after all uploads
      setFeedImages((prev) => [...uploadedImages, ...prev]);
      setUploadFiles([]);
      alert("Images uploaded! Thank you for your contribution");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Some uploads may have failed. Please try again.");
    } finally {
      setUploading(false);
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


  // Load user & restore localStorage (⚡ instant load + background refresh)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      // ✅ Show saved questions immediately (instant render)
      const savedQuestions = JSON.parse(
        localStorage.getItem(`feed_questions_${data.user.id}`) || "[]"
      );
      const savedAnswers = JSON.parse(
        localStorage.getItem(`feed_answers_${data.user.id}`) || "{}"
      );
      const savedComments = JSON.parse(
        localStorage.getItem(`feed_comments_${data.user.id}`) || "{}"
      );

      // Remove already answered from local cache
      const filteredQuestions = savedQuestions.filter(
        (q) => !savedAnswers[q.id]
      );
      setQuestions(filteredQuestions);
      setAnswers(savedAnswers);

      // Restore comments if open
      if (activeQuestion && savedComments[activeQuestion]) {
        setComments(savedComments[activeQuestion]);
      }

      // ✅ Silent background refresh from Supabase
      fetchQuestions(0).then((fresh) => {
        const existingIds = new Set(filteredQuestions.map((q) => q.id));
        const merged = [
          ...filteredQuestions,
          ...fresh.filter((q) => !existingIds.has(q.id)),
        ];
        setQuestions(merged);

        localStorage.setItem(
          `feed_questions_${data.user.id}`,
          JSON.stringify(merged)
        );
      });
    });
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


  // Fetch questions with likes/comments
  const fetchQuestions = async (page = 0, limit = 5) => {
    if (!user) return [];

    const { data: seenData } = await supabase
      .from("qfeed_seen")
      .select("question_id")
      .eq("user_id", user.id);

    const seenList = seenData?.map((s) => s.question_id) || [];

    const { data, error } = await supabase
      .from("quiz_questions")
      .select(
        "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, created_at"
      )
      .not(
        "id",
        "in",
        `(${seenList.join(",") || "00000000-0000-0000-0000-000000000000"})`
      )
      .range(page * limit, page * limit + limit - 1);

    if (error) {
      console.error(error);
      return [];
    }
    if (!data?.length) return [];

    const shuffled = data.sort(() => Math.random() - 0.5);
    const ids = shuffled.map((q) => q.id);
    const quizIds = [...new Set(shuffled.map((q) => q.quiz_id))];

    // Fetch likes
    const { data: likes } = await supabase
      .from("qfeed_likes")
      .select("question_id, user_id")
      .in("question_id", ids);

    // Fetch comments
    const { data: commentsData } = await supabase
      .from("qfeed_comments")
      .select("id, question_id")
      .in("question_id", ids);

    // Fetch quiz titles
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, title")
      .in("id", quizIds);

    return shuffled.map((q) => ({
      ...q,
      qfeed_likes: likes?.filter((l) => l.question_id === q.id) || [],
      comments_count:
        commentsData?.filter((c) => c.question_id === q.id).length || 0,
      quiz_title:
        quizzes?.find((zz) => zz.id === q.quiz_id)?.title || "Untitled Quiz",
    }));
  };

  // Infinite scroll loader
  const loadMore = async () => {
    // 🔮 Prefetch next page silently
    const prefetchNext = async (nextPage) => {
      if (!user) return;
      const nextData = await fetchQuestions(nextPage);
      if (nextData.length > 0) {
        localStorage.setItem(
          `feed_prefetch_${user.id}`,
          JSON.stringify(nextData)
        );
      }
    };

    if (loading || !user) return;
    setLoading(true);

    const savedQuestions = [...questions];
    const seenIdsSet = new Set(savedQuestions.map((q) => q.id));

    const newData = await fetchQuestions(page);
    if (newData.length > 0) {
      const merged = [
        ...savedQuestions,
        ...newData.filter((q) => !seenIdsSet.has(q.id)),
      ];
      setQuestions(merged);
      localStorage.setItem(`feed_questions_${user.id}`, JSON.stringify(merged));
      setPage((prev) => prev + 1);
      // ✅ Start prefetching the next page
      prefetchNext(page + 1);

    }
    setLoading(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) loadMore();
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, questions]);

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

    const newAnswers = { ...answers, [q.id]: option };

    if (q.correct_answer === option) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // Save answer locally
    setAnswers(newAnswers);
    // Increment count only the first time answering this question
    setQuestionCount((prev) => {
      const newCount = prev + 1;
      localStorage.setItem(`feed_count_${user.id}`, newCount);
      return newCount;
    });

    localStorage.setItem(`feed_answers_${user.id}`, JSON.stringify(newAnswers));
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
        "id, comment_text, created_at, user_id, parent_id, profiles(full_name, avatar_url)"
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
          className="p-4 max-w-2xl mx-auto space-y-4 
             h-[80vh] overflow-y-auto overflow-x-hidden
             scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent"
        >
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
                    className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
                    variant="ghost"

                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      await supabase.from("seen_images").delete().eq("user_id", user.id);

                      const { data: newImages, error } = await supabase
                        .from("qfeed_images")
                        .select("*")
                        .order("created_at", { ascending: true });

                      if (error) {
                        console.error(" Failed to reload images:", error);
                        alert(" Failed to reload images.");
                        return;
                      }

                      setFeedImages(newImages);
                      alert("Reset complete! Images refreshed silently.");
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
                    className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
                    variant="ghost"

                    onClick={async () => {
                      console.log(" Starting reset...");
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        console.warn(" No user found!");
                        alert("Please log in first!");
                        return;
                      }

                      try {
                        const { error } = await supabase
                          .from("qfeed_seen")
                          .delete()
                          .eq("user_id", user.id);

                        if (error) throw error;
                        console.log(" qfeed_seen cleared for user:", user.id);

                        localStorage.removeItem(`feed_questions_${user.id}`);
                        localStorage.removeItem(`feed_answers_${user.id}`);
                        localStorage.removeItem(`feed_count_${user.id}`);
                        console.log("🧹 Local cache cleared.");

                        setQuestions([]);
                        setAnswers({});
                        setQuestionCount(0);
                        alert("All seen questions have been reset!");
                      } catch (err) {
                        console.error(" Reset failed:", err);
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
                    className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
                    variant="ghost"

                    onClick={async () => {
                      if (navigator.vibrate) navigator.vibrate(50);

                      if (user) {
                        await loadLeaderboard();
                        setLeaderboardOpen(true);
                      }
                    }}
                  >
                    <Trophy size={20} />
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
                    className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
                    variant="ghost"

                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(50);

                      setPage(0);
                      setQuestions([]);
                      fetchQuestions(0).then((fresh) => {
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
                    <RefreshCcw size={20} />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Reload feed</p>
                </TooltipContent>
              </Tooltip>

            </div>


          </div>

          {(loading || questions.length === 0) &&
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
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative w-full max-w-screen-lg mx-auto mb-5"
                ref={loaderRef}
              >
                <Card className="relative bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-300/30 dark:border-gray-700/30 shadow-lg rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:border-gray-400/50">
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
                        className="flex items-center gap-2 text-sm px-3 py-1 rounded-md border
               bg-gray-100 dark:bg-gray-800
               hover:bg-gray-200 dark:hover:bg-gray-700
               transition"
                      >
                        {isMuted ? (
                          <>
                            <VolumeX size={18} />
                          </>
                        ) : (
                          <>
                            <Volume2 size={18} />
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
                                const audio = new Audio(correct ? "/sounds/tap1.mp3" : "/sounds/tap2.mp3");
                                audio.play().catch((err) => console.error("Audio play error:", err));
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
                      <div className="mt-3 space-y-1 bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-200/30">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Correct Answer: {q.correct_answer}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-snug">
                          {q.explanation}
                        </p>
                      </div>
                    )}

                    {/* Buttons row */}
                    <div className="flex gap-6 mt-4">
                      <Button
                        variant="ghost"
                        className={`flex items-center gap-2 ${liked ? "text-red-500" : ""
                          }`}
                        onClick={() => toggleLike(q.id, liked)}
                      >
                        <Heart size={18} /> {q.qfeed_likes?.length || 0}
                      </Button>

                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                        onClick={() => loadComments(q.id)}
                      >
                        <MessageCircle size={18} /> {commentCount}
                      </Button>

                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                        onClick={() => {
                          const link = window.location.origin;
                          navigator.clipboard.writeText(link);
                          alert("App link copied!");
                        }}
                      >
                        <Reply size={18} /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );

            // 🖼️ Fancy image card + delete option + upload always last
            if ((index + 1) % 2 === 0) {
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
                    whileHover={{ scale: 1.02 }}
                    className="w-full max-w-screen-md mx-auto mb-6"
                  >
                    <Card className="rounded-2xl overflow-hidden bg-white/30 dark:bg-gray-800/50 border border-gray-200/30 shadow-md relative">
                      {/* updated: educational inspiration banner */}
                      <div className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white text-center py-2 text-sm font-medium">
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


                      <img
                        src={img.image_url}
                        alt={img.title || "Feed image"}
                        onClick={async () => {
                          openViewer(img);

                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          // Insert record into seen_images
                          const { error } = await supabase.from("seen_images").insert({
                            user_id: user.id,
                            image_id: img.id,
                          });

                          if (error) {
                            console.error("Failed to mark image as seen:", error);
                          } else {
                            console.log("Marked image as seen:", img.id);
                            // Remove immediately from feed without reload
                            setFeedImages((prev) => prev.filter((i) => i.id !== img.id));
                          }
                        }}
                        className="w-full h-auto max-h-[80vh] sm:max-h-[70vh] object-contain cursor-pointer transition-transform hover:scale- 100 duration-300 bg-black rounded-3xl"
                      />

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
                  className="relative flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl overflow-hidden shadow-lg w-full bg-white dark:bg-gray-900 mt-4 mx-auto max-w-md"

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
                      className="text-gray-800 dark:text-gray-200 text-sm border-b border-gray-400 dark:border-gray-500 hover:border-gray-600 dark:hover:border-gray-300 transition-all duration-300 pb-1"
                    >
                      {showUpload ? "Hide Upload ▲" : "Upload Image ▼"}
                    </button>
                    {/* Dropdown upload card */}
                    {showUpload && (
                      <div className="mt-3 flex flex-col items-center justify-center text-center w-full sm:w-auto border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 sm:p-5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 overflow-hidden"
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
                            <div className="flex flex-col items-center">
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
                        <Button
                          onClick={handleImageUpload}
                          disabled={uploading || uploadFiles.length === 0}
                          variant="ghost"
                          className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        </Button>

                        {/* Subtitle */}
                        <p className="mt-2 text-gray-600 dark:text-gray-400 text-xs sm:text-sm text-center">
                          Share your photos & inspire others
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );



            }


            return cards;
          })}

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
            className="flex flex-col items-center justify-center py-4 w-full gap-5"
          >
            {(loading || questions.length === 0) &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full max-w-screen-lg mx-auto bg-white/40 dark:bg-gray-800/60 
                   backdrop-blur-md border border-gray-300/30 dark:border-gray-700/30 
                   rounded-2xl shadow-lg overflow-hidden animate-pulse"
                >
                  {/* Question area */}
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div> {/* quiz title */}
                    <div className="h-6 w-full bg-gray-300 dark:bg-gray-700 rounded"></div> {/* question text */}

                    {/* Options */}
                    <div className="space-y-2 mt-3">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div
                          key={j}
                          className="h-10 w-full bg-gray-300 dark:bg-gray-700 rounded"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Image placeholder for every other card */}
                  {i % 2 === 1 && (
                    <div className="w-full h-60 bg-gray-300 dark:bg-gray-700 rounded-b-2xl" />
                  )}
                </div>
              ))}
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

              <div className="overflow-y-auto scrollbar scrollbar-thumb-blue-500/60 dark:scrollbar-thumb-blue-400/50 scrollbar-track-transparent">

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
                        alt={c.profiles?.full_name || "User"}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {c.profiles?.full_name || "User"}
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
                className="overflow-y-auto scrollbar scrollbar-thumb-blue-500/60 dark:scrollbar-thumb-blue-400/50 scrollbar-track-transparent">


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

      </PullToRefresh>
    </>
  );
}
