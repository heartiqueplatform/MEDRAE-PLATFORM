"use client";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Star, Send, Reply, CheckCircle, Clock, User, Shield, Sparkles, ChevronLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
  playSound("ui-tap");
  if (type === "success") vibrate([15, 30, 15]);
  else if (type === "warning") vibrate(60);
  else vibrate(15);
};

// Confetti animation component (unchanged)
const Confetti = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number }>>([]);

  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8A80', '#B39DDB'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 1.5
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-confetti"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${1.5 + Math.random()}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confettiFall linear forwards;
        }
      `}</style>
    </div>
  );
};

// Cute celebration emoji component (unchanged)
const Celebration = () => (
  <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center">
    <div className="text-8xl md:text-9xl animate-bounce">
      🎉
    </div>
  </div>
);

export function Feedback() {
  const navigate = useNavigate();
  const home = useHomeRoute();

  const handleBack = useCallback(() => {
    tap();
    navigate(home, { replace: true });
  }, [navigate, home]);

  const ADMIN_ID = "25f37970-c9b9-4c15-b8a2-514a912e3261";
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState({
    category: "",
    subject: "",
    message: "",
    rating: 0,
  });

  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [allFeedback, setAllFeedback] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "admin">("my");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
        setIsAdmin(data.user.id === ADMIN_ID);
        fetchMyFeedback(data.user.id);
        if (data.user.id === ADMIN_ID) {
          fetchAllFeedback();
        }
      }
    };
    getUser();
  }, []);

  // Fetch feedback from Supabase
  const fetchMyFeedback = async (uid: string) => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("user_id", uid)
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      setMyFeedback(data);
    }
  };

  const fetchAllFeedback = async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      setAllFeedback(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.category || !feedback.subject || !feedback.message) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (feedback.rating < 1 || feedback.rating > 5) {
      toast({ title: "Please select a rating between 1 and 5", variant: "destructive" });
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("feedback")
        .insert({
          category: feedback.category,
          subject: feedback.subject,
          message: feedback.message,
          rating: feedback.rating,
          is_anonymous: isAnonymous,
          user_id: userId,
          status: "Submitted",
        });

      if (error) {
        console.error("Supabase error:", error);
        toast({
          title: "Submission failed",
          description: error.message || "Please try again",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Feedback submitted successfully! 🎉",
          description: "Thank you for your feedback!"
        });

        setShowConfetti(true);
        setShowCelebration(true);
        setTimeout(() => {
          setShowConfetti(false);
          setShowCelebration(false);
        }, 3000);

        if (userId) fetchMyFeedback(userId);
        if (isAdmin) fetchAllFeedback();

        setFeedback({ category: "", subject: "", message: "", rating: 0 });
        setIsAnonymous(false);
        setIsConfirming(false);
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast({
        title: "Submission failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (feedbackId: string) => {
    if (!replyMessage.trim()) {
      toast({ title: "Please enter a reply message", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("feedback")
        .update({
          admin_response: replyMessage,
          status: "Resolved",
          resolved_at: new Date().toISOString(),
          admin_id: userId,
        })
        .eq("id", feedbackId);

      if (error) {
        toast({ title: "Failed to send reply", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reply sent successfully! 🎉" });
        setReplyMessage("");
        setReplyingTo(null);
        fetchAllFeedback();
      }
    } catch (err: any) {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 cursor-pointer transition-colors ${i < rating
          ? "text-amber-500 fill-current"
          : "text-slate-300 dark:text-slate-600"
          }`}
        onClick={() => {
          tap();
          setFeedback((prev) => ({ ...prev, rating: i + 1 }));
        }}
        style={{ touchAction: "manipulation" }}
      />
    ));

  const getStatusBadge = (status: string) => {
    const base =
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold";
    switch (status) {
      case 'Resolved':
        return <span className={`${base} bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400`}><CheckCircle size={11} /> Resolved</span>;
      case 'Submitted':
        return <span className={`${base} bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400`}><Clock size={11} /> Submitted</span>;
      case 'In Review':
        return <span className={`${base} bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400`}><Clock size={11} /> In Review</span>;
      case 'Rejected':
        return <span className={`${base} bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400`}>Rejected</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{status}</span>;
    }
  };

  const pendingCount = allFeedback.filter(f => f.status === 'Submitted' || f.status === 'In Review').length;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden"
      style={{ WebkitTapHighlightColor: "transparent" }}>
      {showConfetti && <Confetti />}
      {showCelebration && <Celebration />}

      {/* ── Sticky top bar ─────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-2 px-2 h-14
                         bg-white dark:bg-[#0d1117]
                         border-b border-slate-200/70 dark:border-white/[0.06]
                         z-30 safe-top">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="h-10 w-10 rounded-full flex items-center justify-center
                     text-slate-700 dark:text-slate-200
                     active:bg-slate-100 dark:active:bg-white/5
                     transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
            Feedback
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
            Share your thoughts and view replies
          </p>
        </div>
      </header>

      {/* ── Scrolling body ─────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
        <div className="w-full max-w-[880px] mx-auto px-4 py-4 pb-24 safe-bottom space-y-3">

          {/* ── Submit Feedback Card ─────────────────────── */}
          <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-400/10
                              flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider
                              text-blue-600 dark:text-blue-400 leading-none mb-1">
                  New
                </p>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Submit feedback
                </h2>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug -mt-1">
              Help us improve by sharing your thoughts and suggestions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Anonymous toggle */}
              <div className="flex items-center justify-between gap-2 rounded-xl
                              bg-slate-50 dark:bg-[#0d1117] px-3 py-2.5">
                <Label htmlFor="anonymous" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Submit anonymously
                </Label>
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {/* Category */}
              <Field label="Category" required>
                <Select
                  value={feedback.category}
                  onValueChange={(value) =>
                    setFeedback((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="w-full h-10 rounded-xl border-0
                                             bg-slate-50 dark:bg-[#0d1117]
                                             text-sm
                                             focus:ring-2 focus:ring-blue-500/40">
                    <SelectValue placeholder="Select feedback category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="feature-request">Feature Request</SelectItem>
                    <SelectItem value="performance">Performance Issue</SelectItem>
                    <SelectItem value="ui-ux">UI/UX Feedback</SelectItem>
                    <SelectItem value="data-error">Data Error</SelectItem>
                    <SelectItem value="security">Security Concern</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Subject */}
              <Field label="Subject" required>
                <Input
                  id="subject"
                  placeholder="Brief description of your feedback"
                  value={feedback.subject}
                  onChange={(e) =>
                    setFeedback((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="h-10 rounded-xl border-0 text-sm
                             bg-slate-50 dark:bg-[#0d1117]
                             focus-visible:ring-2 focus-visible:ring-blue-500/40"
                />
              </Field>

              {/* Rating */}
              <Field label="Rating" required>
                <div className="flex items-center gap-1 rounded-xl
                                bg-slate-50 dark:bg-[#0d1117] px-3 py-2.5">
                  <div className="flex items-center gap-0.5">
                    {renderStars(feedback.rating)}
                  </div>
                  <span className="ml-auto text-[11px] font-bold
                                   text-slate-500 dark:text-slate-400 tabular-nums">
                    {feedback.rating > 0 ? `${feedback.rating}/5` : "Tap a star"}
                  </span>
                </div>
                {feedback.rating === 0 && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
                    Please select a rating
                  </p>
                )}
              </Field>

              {/* Message */}
              <Field label="Message" required>
                <Textarea
                  id="message"
                  placeholder="Your detailed feedback"
                  className="min-h-[100px] rounded-xl border-0 text-sm resize-none
                             bg-slate-50 dark:bg-[#0d1117]
                             focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  value={feedback.message}
                  onChange={(e) =>
                    setFeedback((prev) => ({ ...prev, message: e.target.value }))
                  }
                />
              </Field>

              <button
                type="submit"
                disabled={isSubmitting || feedback.rating === 0}
                className="w-full h-10 rounded-xl
                           bg-blue-600 text-white
                           text-sm font-bold
                           flex items-center justify-center gap-1.5
                           active:scale-[0.97] transition-transform
                           disabled:opacity-50 disabled:cursor-not-allowed
                           disabled:active:scale-100"
                style={{ touchAction: "manipulation" }}
              >
                <Send className="h-4 w-4" />
                {isSubmitting
                  ? "Sending…"
                  : isConfirming
                    ? "Tap again to confirm"
                    : "Submit feedback"}
              </button>
            </form>
          </section>

          {/* ── Tab switcher ─────────────────────────────── */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                tap();
                setActiveTab("my");
              }}
              className={`flex-1 h-10 rounded-xl text-sm font-bold
                          flex items-center justify-center gap-1.5
                          active:scale-[0.97] transition-all
                          ${activeTab === "my"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                }`}
              style={{ touchAction: "manipulation" }}
            >
              <User size={15} />
              My feedback
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  tap();
                  setActiveTab("admin");
                }}
                className={`flex-1 h-10 rounded-xl text-sm font-bold
                            flex items-center justify-center gap-1.5
                            active:scale-[0.97] transition-all
                            ${activeTab === "admin"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                  }`}
                style={{ touchAction: "manipulation" }}
              >
                <Shield size={15} />
                Admin
                {pendingCount > 0 && (
                  <span className="ml-1 bg-rose-600 text-white text-[10px] font-bold
                                   px-1.5 py-0.5 rounded-full tabular-nums min-w-[18px] text-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* ── My Feedback history ──────────────────────── */}
          {activeTab === "my" && (
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06]
                                flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider
                                text-slate-500 dark:text-slate-400 leading-none mb-1">
                    History
                  </p>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    My feedback
                  </h2>
                </div>
              </div>

              <div className="space-y-2">
                {myFeedback.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-10 leading-relaxed">
                    No feedback submitted yet. Be the first! 🌟
                  </p>
                ) : (
                  myFeedback.map((fb) => (
                    <div key={fb.id}
                      className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug flex-1 min-w-0 truncate">
                          {fb.subject}
                        </p>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5
                                         text-[10px] font-bold shrink-0
                                         bg-slate-100 text-slate-600
                                         dark:bg-white/[0.06] dark:text-slate-300 capitalize">
                          {fb.category}
                        </span>
                      </div>

                      <div className="rounded-lg bg-white dark:bg-[#161b22] p-2.5">
                        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-blue-600 dark:text-blue-400">You:</span>{" "}
                          {fb.message}
                        </p>
                      </div>

                      {fb.admin_response ? (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-400/10 p-2.5">
                          <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Admin:</span>{" "}
                            {fb.admin_response}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-slate-400 dark:text-slate-500
                                      flex items-center gap-1">
                          <Clock size={11} /> No reply yet
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2
                                      text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                        <span className="tabular-nums">
                          Rating: {fb.rating ? `${fb.rating}/5` : "N/A"}
                        </span>
                        <span>·</span>
                        {getStatusBadge(fb.status)}
                        <span>·</span>
                        <span>{new Date(fb.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ── Admin panel ──────────────────────────────── */}
          {activeTab === "admin" && isAdmin && (
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-400/10
                                flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider
                                text-blue-600 dark:text-blue-400 leading-none mb-1">
                    Admin
                  </p>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    All feedback
                  </h2>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug -mt-1">
                Review and respond to user feedback. {pendingCount} pending repl{pendingCount === 1 ? "y" : "ies"}.
              </p>

              <div className="space-y-2">
                {allFeedback.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-10">
                    No feedback submitted yet.
                  </p>
                ) : (
                  allFeedback.map((fb) => (
                    <div key={fb.id}
                      className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-400/10
                                          flex items-center justify-center
                                          text-blue-600 dark:text-blue-400 font-bold text-[12px] shrink-0">
                            {fb.is_anonymous
                              ? '👤'
                              : (fb.user?.email?.[0]?.toUpperCase() || 'U')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                              {fb.subject}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {fb.is_anonymous ? 'Anonymous' : fb.user?.email || 'User'} · {fb.category}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(fb.status)}
                      </div>

                      <div className="rounded-lg bg-white dark:bg-[#161b22] p-2.5">
                        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-blue-600 dark:text-blue-400">User:</span>{" "}
                          {fb.message}
                        </p>
                      </div>

                      {fb.rating > 0 && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < fb.rating
                                ? "text-amber-500 fill-current"
                                : "text-slate-300 dark:text-slate-600"
                                }`}
                            />
                          ))}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1 tabular-nums">
                            ({fb.rating}/5)
                          </span>
                        </div>
                      )}

                      {fb.admin_response ? (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-400/10 p-2.5">
                          <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Admin:</span>{" "}
                            {fb.admin_response}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Write your reply…"
                            value={replyingTo === fb.id ? replyMessage : ""}
                            onChange={(e) => {
                              setReplyingTo(fb.id);
                              setReplyMessage(e.target.value);
                            }}
                            className="min-h-[60px] rounded-xl border-0 text-sm resize-none
                                       bg-white dark:bg-[#161b22]
                                       focus-visible:ring-2 focus-visible:ring-blue-500/40"
                          />
                          {replyingTo === fb.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  tap("success");
                                  handleReply(fb.id);
                                }}
                                className="flex-1 h-9 rounded-xl
                                           bg-emerald-600 text-white
                                           text-[11px] font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                              >
                                <Reply size={13} />
                                Send reply
                              </button>
                              <button
                                onClick={() => {
                                  tap();
                                  setReplyingTo(null);
                                  setReplyMessage("");
                                }}
                                className="h-9 px-4 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-[11px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                tap();
                                setReplyingTo(fb.id);
                              }}
                              className="h-9 px-4 rounded-xl
                                         bg-slate-100 dark:bg-white/[0.06]
                                         text-slate-700 dark:text-slate-200
                                         text-[11px] font-bold
                                         flex items-center gap-1.5
                                         active:scale-[0.97] transition-transform"
                              style={{ touchAction: "manipulation" }}
                            >
                              <Reply size={13} />
                              Reply
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2
                                      text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                        <span>Submitted: {new Date(fb.submitted_at).toLocaleString()}</span>
                        {fb.resolved_at && (
                          <>
                            <span>·</span>
                            <span>Resolved: {new Date(fb.resolved_at).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider
                    text-slate-500 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-500 dark:text-rose-400">*</span>}
      </p>
      {children}
    </div>
  );
}