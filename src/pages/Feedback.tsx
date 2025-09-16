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
import { Star, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function Feedback() {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedback, setFeedback] = useState({
    category: "",
    subject: "",
    message: "",
    rating: 0,
  });

  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
        fetchMyFeedback(data.user.id);
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
    .order("submitted_at", { ascending: false }); //FIXED

  if (!error && data) {
    setMyFeedback(data);
  }
};


  // Real-time updates for feedback changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("feedback_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback", filter: `user_id=eq.${userId}` },
        (payload) => {
          fetchMyFeedback(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.category || !feedback.subject || !feedback.message) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    const { error } = await supabase.from("feedback").insert([
      {
        category: feedback.category,
        subject: feedback.subject,
        message: feedback.message,
        rating: feedback.rating,
        is_anonymous: isAnonymous,
        user_id: userId, // store who sent it
      },
    ]);

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Feedback submitted successfully!", description: "Thank you for your feedback!" });
      setFeedback({ category: "", subject: "", message: "", rating: 0 });
      setIsAnonymous(false);
      setIsConfirming(false);
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 cursor-pointer ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
        onClick={() => setFeedback((prev) => ({ ...prev, rating: i + 1 }))}
      />
    ));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Submit Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Submit New Feedback</CardTitle>
          <CardDescription>
            Help us improve by sharing your thoughts and suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Anonymous toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous">Submit anonymously</Label>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={feedback.category}
                onValueChange={(value) =>
                  setFeedback((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
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

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your feedback"
                value={feedback.subject}
                onChange={(e) =>
                  setFeedback((prev) => ({ ...prev, subject: e.target.value }))
                }
              />
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {renderStars(feedback.rating)}
                <span className="ml-2 text-sm text-muted-foreground">
                  {feedback.rating > 0 && `${feedback.rating}/5`}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Your detailed feedback"
                className="min-h-[120px]"
                value={feedback.message}
                onChange={(e) =>
                  setFeedback((prev) => ({ ...prev, message: e.target.value }))
                }
              />
            </div>

            <Button type="submit" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {isConfirming ? "Click again to confirm & send" : "Submit Feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Right: My Feedback History */}
<Card>
  <CardHeader>
    <CardTitle>My Feedback</CardTitle>
    <CardDescription>See what you sent and admin replies.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
    {myFeedback.length === 0 ? (
      <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
    ) : (
      myFeedback.map((fb) => (
        <div key={fb.id} className="p-3 border rounded-lg space-y-2">
          {/* Subject + Category */}
          <div className="flex justify-between items-center">
            <p className="font-medium">{fb.subject}</p>
            <span className="text-xs text-muted-foreground">{fb.category}</span>
          </div>

          {/* User Message */}
        <div className="bg-gray-700 text-white border-l-4 border-gray-400 p-2 text-sm">
  <strong>You:</strong> {fb.message}
</div>


          {/* Admin Reply */}
          {fb.admin_response ? (
           <div className="bg-green-50 text-gray-900 border-l-4 border-green-500 p-2 text-sm dark:bg-green-900 dark:text-green-100">
  <strong>Admin:</strong> {fb.admin_response}
</div>

          ) : (
            <p className="text-xs italic text-muted-foreground">No reply yet</p>
          )}

          {/* Extra Info */}
          <p className="text-xs text-muted-foreground">
            Rating: {fb.rating ? `${fb.rating}/5` : "N/A"} • Status: {fb.status} • Sent on{" "}
            {new Date(fb.submitted_at).toLocaleString()}
          </p>
        </div>
      ))
    )}
  </CardContent>
</Card>
    </div>
  );
}
