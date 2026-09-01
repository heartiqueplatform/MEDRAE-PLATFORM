"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Star, Send, Reply, CheckCircle, Clock, User, Shield, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Confetti animation component
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

// Cute celebration emoji component
const Celebration = () => (
  <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center">
    <div className="text-8xl md:text-9xl animate-bounce">
      🎉
    </div>
  </div>
);

export function Feedback() {
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

    // Validate rating is between 1-5
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
        className={`h-4 w-4 cursor-pointer ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
          }`}
        onClick={() => setFeedback((prev) => ({ ...prev, rating: i + 1 }))}
      />
    ));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full text-xs"><CheckCircle size={12} /> Resolved</span>;
      case 'Submitted':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full text-xs"><Clock size={12} /> Submitted</span>;
      case 'In Review':
        return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full text-xs"><Clock size={12} /> In Review</span>;
      case 'Rejected':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full text-xs">Rejected</span>;
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center bg-gray-50 dark:bg-background">
      {showConfetti && <Confetti />}
      {showCelebration && <Celebration />}

      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-0 md:space-y-4 px-0 md:px-4 py-0 md:py-4">

        {/* Submit Feedback Card - Mobile Native */}
        <Card className="border-0 rounded-none md:rounded-xl shadow-none md:shadow-sm dark:bg-muted/30">
          <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Sparkles className="text-blue-500" size={20} />
              Submit New Feedback
            </CardTitle>
            <CardDescription className="text-sm">
              Help us improve by sharing your thoughts and suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="anonymous" className="text-sm">Submit anonymously</Label>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
                <Select
                  value={feedback.category}
                  onValueChange={(value) =>
                    setFeedback((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="w-full rounded-lg md:rounded-xl border-gray-200 dark:border-gray-700">
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
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your feedback"
                  value={feedback.subject}
                  onChange={(e) =>
                    setFeedback((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="rounded-lg md:rounded-xl border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-sm font-medium">Rating (1-5) *</Label>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {renderStars(feedback.rating)}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {feedback.rating > 0 ? `${feedback.rating}/5` : "Click a star"}
                  </span>
                </div>
                {feedback.rating === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select a rating</p>
                )}
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Your detailed feedback"
                  className="min-h-[100px] md:min-h-[120px] rounded-lg md:rounded-xl border-gray-200 dark:border-gray-700"
                  value={feedback.message}
                  onChange={(e) =>
                    setFeedback((prev) => ({ ...prev, message: e.target.value }))
                  }
                />
              </div>

              {/* Submit Button - Centered */}
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={isSubmitting || feedback.rating === 0}
                  className="flex items-center gap-2 w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg md:rounded-xl py-2.5 md:py-2 px-6 transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Sending..." : isConfirming ? "Click again to confirm & send" : "Submit Feedback ✨"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabs for My Feedback / Admin Panel - Centered on Desktop */}
        <div className="flex justify-center gap-2 px-4 md:px-0 pt-2 md:pt-0">
          <button
            onClick={() => setActiveTab("my")}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-sm font-bold transition-all ${activeTab === "my"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
          >
            <User size={16} className="inline mr-2" />
            My Feedback
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-sm font-bold transition-all ${activeTab === "admin"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
            >
              <Shield size={16} className="inline mr-2" />
              Admin Panel
              {allFeedback.filter(f => f.status === 'Submitted' || f.status === 'In Review').length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {allFeedback.filter(f => f.status === 'Submitted' || f.status === 'In Review').length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* My Feedback History - Centered on Desktop */}
        {activeTab === "my" && (
          <div className="flex justify-center">
            <Card className="border-0 rounded-none md:rounded-xl shadow-none md:shadow-sm w-full md:max-w-full md:px-4 lg:px-6 dark:bg-muted/30">
              <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
                <CardTitle className="text-lg md:text-xl">My Feedback</CardTitle>
                <CardDescription className="text-sm">See what you sent and admin replies.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="space-y-3 md:space-y-4 max-h-[400px] md:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-background pr-1 md:pr-2">
                  {myFeedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 md:py-12">No feedback submitted yet. Be the first! 🌟</p>
                  ) : (
                    myFeedback.map((fb, index) => (
                      <div key={fb.id} className="p-3 md:p-4 border rounded-lg md:rounded-xl space-y-2 bg-white dark:bg-muted/30">
                        {index > 0 && (
                          <div className="block md:hidden h-px bg-gray-200 dark:bg-gray-800 -mx-3" />
                        )}

                        <div className="flex justify-between items-center flex-wrap gap-1">
                          <p className="font-medium text-sm md:text-base">{fb.subject}</p>
                          <span className="text-[10px] md:text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {fb.category}
                          </span>
                        </div>

                        <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-4 border-blue-500 p-2.5 md:p-3 text-sm rounded-r-lg">
                          <strong className="text-blue-600 dark:text-blue-400">You:</strong> {fb.message}
                        </div>

                        {fb.admin_response ? (
                          <div className="bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-green-100 border-l-4 border-green-500 p-2.5 md:p-3 text-sm rounded-r-lg">
                            <strong className="text-green-600 dark:text-green-400">Admin:</strong> {fb.admin_response}
                          </div>
                        ) : (
                          <p className="text-xs italic text-muted-foreground flex items-center gap-1">
                            <Clock size={12} /> No reply yet
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-muted-foreground pt-1">
                          <span>Rating: {fb.rating ? `${fb.rating}/5` : "N/A"}</span>
                          <span className="hidden md:inline">•</span>
                          <span>{getStatusBadge(fb.status)}</span>
                          <span className="hidden md:inline">•</span>
                          <span>{new Date(fb.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Panel - All Feedback with Reply - Centered on Desktop */}
        {activeTab === "admin" && isAdmin && (
          <div className="flex justify-center">
            <Card className="border-0 rounded-none md:rounded-xl shadow-none md:shadow-sm w-full md:max-w-full md:px-4 lg:px-6 dark:bg-muted/30">
              <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Shield className="text-blue-600" size={20} />
                  Admin - All Feedback
                </CardTitle>
                <CardDescription className="text-sm">
                  Review and respond to user feedback. {allFeedback.filter(f => f.status === 'Submitted' || f.status === 'In Review').length} pending replies.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="space-y-3 md:space-y-4 max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-background pr-1 md:pr-2">
                  {allFeedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 md:py-12">No feedback submitted yet.</p>
                  ) : (
                    allFeedback.map((fb, index) => (
                      <div key={fb.id} className="p-3 md:p-4 border rounded-lg md:rounded-xl space-y-2 bg-white dark:bg-muted/30">
                        {index > 0 && (
                          <div className="block md:hidden h-px bg-gray-200 dark:bg-gray-800 -mx-3" />
                        )}

                        <div className="flex justify-between items-center flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm">
                              {fb.is_anonymous ? '👤' : (fb.user?.email?.[0]?.toUpperCase() || 'U')}
                            </div>
                            <div>
                              <p className="font-medium text-sm md:text-base">{fb.subject}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {fb.is_anonymous ? 'Anonymous' : fb.user?.email || 'User'} • {fb.category}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(fb.status)}
                        </div>

                        <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-4 border-blue-500 p-2.5 md:p-3 text-sm rounded-r-lg">
                          <strong>User:</strong> {fb.message}
                        </div>

                        {fb.rating > 0 && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < fb.rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">({fb.rating}/5)</span>
                          </div>
                        )}

                        {fb.admin_response ? (
                          <div className="bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-green-100 border-l-4 border-green-500 p-2.5 md:p-3 text-sm rounded-r-lg">
                            <strong className="text-green-600 dark:text-green-400">Admin Reply:</strong> {fb.admin_response}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Write your reply..."
                              value={replyingTo === fb.id ? replyMessage : ""}
                              onChange={(e) => {
                                setReplyingTo(fb.id);
                                setReplyMessage(e.target.value);
                              }}
                              className="min-h-[60px] rounded-lg border-gray-200 dark:border-gray-700 text-sm"
                            />
                            {replyingTo === fb.id && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleReply(fb.id)}
                                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
                                >
                                  <Reply size={14} />
                                  Send Reply
                                </Button>
                                <Button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyMessage("");
                                  }}
                                  variant="outline"
                                  className="text-sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                            {replyingTo !== fb.id && (
                              <Button
                                onClick={() => setReplyingTo(fb.id)}
                                variant="outline"
                                className="text-sm"
                              >
                                <Reply size={14} className="mr-2" />
                                Reply
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-muted-foreground pt-1">
                          <span>Submitted: {new Date(fb.submitted_at).toLocaleString()}</span>
                          {fb.resolved_at && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <span>Resolved: {new Date(fb.resolved_at).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}