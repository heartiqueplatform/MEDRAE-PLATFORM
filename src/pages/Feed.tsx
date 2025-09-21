"use client"; 
import PullToRefresh from "react-simple-pull-to-refresh";
import { useWindowSize } from "react-use";
import { motion, AnimatePresence } from "framer-motion";

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
  // ✅ Sync answered questions to qfeed_seen whenever answers change
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
      console.error("❌ Failed syncing to qfeed_seen:", err);
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

    // 3️⃣ Fetch profiles for these users
    const userIds = countsArray.map((row) => row.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    if (profilesError) throw profilesError;

    // 4️⃣ Merge counts with profiles
    let leaderboardData = countsArray
      .map((row) => {
        const profile = profilesData.find((p) => p.user_id === row.user_id);
        return {
          user_id: row.user_id,
          name: profile?.name || "Unknown",
          avatar: profile?.avatar_url || "/default-avatar.png",
          total: row.total,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ✅ Ensure current user is visible even if not top 10
    if (!leaderboardData.some((u) => u.user_id === user.id)) {
      const myCount = countsMap[user.id] || 0;
      const myProfile = profilesData.find((p) => p.user_id === user.id);
      leaderboardData.push({
        user_id: user.id,
        name: myProfile?.name || "You",
        avatar: myProfile?.avatar_url || "/default-avatar.png",
        total: myCount,
      });
    }

    setLeaderboard(leaderboardData);
  } catch (err) {
    console.error("❌ Failed to load leaderboard:", err);
  }
};


 return (
  <>
    {showConfetti && (
  <Confetti
    width={width}
    height={height}
    recycle={false} // confetti won't loop forever
    numberOfPieces={300} // more confetti 🎉
  />
)}


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
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* 🔄 Reload Feed button */}
     <div className="flex justify-between items-center mt-4">
  <div className="flex items-center gap-4">
  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
    Questions Tried: {questionCount}
  </span>
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
      loadLeaderboard();
      setLeaderboardOpen(true);
    }}
  >
    Leaderboard
  </Button>
</div>

  <Button
    variant="outline"
    onClick={() => {
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
    Reload Feed
  </Button>
</div>

        {questions.length === 0 &&
          loading &&
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

        {questions.map((q) => {
          const liked = q.qfeed_likes?.some((l) => l.user_id === user?.id);
          const selected = answers[q.id];
          const savedComments = JSON.parse(
            localStorage.getItem(`feed_comments_${user?.id}`) || "{}"
          );
          const commentCount =
            savedComments[q.id]?.length || q.comments_count || 0;

          return (
<Card
  key={q.id}
  className="p-4 shadow-md rounded-xl w-full max-w-screen-lg mx-auto flex flex-col"
>

           <CardContent className="flex flex-col gap-3 w-full">

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {q.quiz_title}
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {q.question_text}
                </p>
<div className="flex flex-col gap-3 mt-3 w-full">
{["A", "B", "C", "D"].map((opt) => {
  const text = q[`option_${opt.toLowerCase()}`];
  if (!text) return null;
  const chosen = selected === opt;
  const correct = q.correct_answer === opt;

  // Determine circle color
  let circleColor = "bg-gray-400";
  if (selected) {
    if (correct && chosen) circleColor = "bg-green-500";
    else if (!correct && chosen) circleColor = "bg-red-500";
  }

  return (
    <button
      key={opt}
      onClick={() => handleAnswer(q, opt)}
      disabled={!!selected}
      className="w-full flex items-start gap-3 px-2 py-2 text-left rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {/* Colored circle */}
      <span
        className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ${circleColor}`}
      ></span>

      {/* Option letter + text */}
      <div className="flex gap-2 break-words">
        <span className="font-medium">{opt}.</span>
        <span className="break-words">{text}</span>
      </div>
    </button>
  );
})}

</div>


              {selected && (
  <div className="mt-3 p-3 rounded bg-gray-50 dark:bg-gray-800 relative overflow-hidden">
    {q.correct_answer === selected && (
      <Confetti
        width={350}             // wider burst inside the card
        height={220}
        recycle={false}          // only fires once
        numberOfPieces={400}     // 🌟 way more pieces
        tweenDuration={5000}     // pieces fall slower, feels fuller
        gravity={0.3}            // less gravity = floaty confetti
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
    )}
    <p className="font-semibold">
      Correct Answer: {q.correct_answer}
    </p>
    <p className="text-gray-700 dark:text-gray-300">
      {q.explanation}
    </p>
  </div>
)}


                {/* ✅ Buttons (only once) */}
                <div className="flex gap-6 mt-4">
                  <Button
                    variant="ghost"
                    className={`flex items-center gap-2 ${
                      liked ? "text-red-500" : ""
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
    const link = window.location.origin; // just the app link
    navigator.clipboard.writeText(link);
    alert("App link copied!");
  }}
>
  <Reply size={18} /> Share
</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div
          ref={loaderRef}
          className="flex flex-col items-center justify-center py-4"
        >
          {loading && (
            <>
              <div className="scale-75">
                <GlobalLoader />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Loading questions...
              </p>
            </>
          )}
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

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map((c) => {
                const isReply = !!c.parent_id;
                const liked = c.comment_likes?.some(
                  (l) => l.user_id === user?.id
                );
                return (
                  <div
                    key={c.id}
                    className={`flex items-start gap-3 ${
                      isReply ? "ml-8" : ""
                    }`}
                  >
                    <img
                      src={c.profiles?.avatar_url || "/default-avatar.png"}
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
  <DialogContent className="max-w-md" aria-describedby="leaderboard-desc">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold">Leaderboard</DialogTitle>
    </DialogHeader>

    <div id="leaderboard-desc" className="space-y-4">
      <AnimatePresence>
        {Object.values(
          leaderboard.reduce((acc: Record<number, typeof leaderboard>, entry) => {
            if (!acc[entry.total]) acc[entry.total] = [];
            acc[entry.total].push(entry);
            return acc;
          }, {})
        )
          .sort((a, b) => b[0].total - a[0].total) // highest total first
          .map((batch, batchIndex) => (
            <div key={batchIndex} className="space-y-2">
              {batch.map((entry) => {
                const position = leaderboard.indexOf(entry) + 1;

                // ⭐ Stars + textual badge for top users
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
                    className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800"
                  >
                    <span className="text-lg font-bold w-6">{position}</span>
                    <motion.img
                      src={entry.avatar || "/default-avatar.png"}
                      alt={entry.name}
                      className="w-8 h-8 rounded-full"
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                    <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
                      {entry.name || "Unknown"}
                    </span>
                    <span className="text-sm text-gray-500">{entry.total} Qs</span>

                    {badge && (
                      <span className="ml-2 flex items-center gap-1 text-xs font-semibold">
                        {Array.from({ length: badge.stars }).map((_, i) => (
                          <motion.svg
                            key={i}
                            className="w-3 h-3 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                          >
                            <path d="M10 1l2.39 4.85L18 6.5l-3.9 3.8.92 5.38L10 13.77 5.98 15.68l.92-5.38L3 6.5l5.61-.65L10 1z" />
                          </motion.svg>
                        ))}
                        {badge.label}
                      </span>
                    )}
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
      {/* 🔝 Back to Top Button */}
<button
  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
  className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-blue-500 dark:bg-blue-600 text-white shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition"
>
  Top
</button>

    </PullToRefresh>
  </>
);
}
