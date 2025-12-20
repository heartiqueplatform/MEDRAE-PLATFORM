"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader"; // loader for history
import { MessageCircle, Send, X, Stethoscope, Trash2 } from "lucide-react";

type Message = {
  role: string;
  content: string;
  timestamp: string;
};

function FloatingTypingBubbles({ isDarkTheme }: { isDarkTheme: boolean }) {
  const bubbleColor = isDarkTheme ? "bg-teal-400" : "bg-teal-600";

  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
    </div>
  );
}


function stripMarkdown(text: string): string {
  return text
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*>+\s?/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")
    .replace(/^([-*]_?){3,}$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Vibrate device for short feedback
  const vibrate = (duration: number = 50) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkTheme(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Load chat history
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;
        const { data, error } = await supabase
          .from("Aimessages")
          .select("*")
          .eq("user_id", currentUser?.id)
          .order("timestamp", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setMessages(
            data.map((msg) => ({
              role: msg.sender,
              content: msg.content,
              timestamp: new Date(msg.timestamp).toISOString(),
            }))
          );
        } else {
          setMessages([
            {
              role: "assistant",
              content:
                "❤️ Hello! I'm your AI Study Assistant. Ask me anything about nursing concepts or drug info!",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchMessages();
  }, []);

  // Auto-scroll whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // Send message to backend and save to Supabase
  const sendMessage = async () => {
    if (!input.trim()) return;

    const currentUser = (await supabase.auth.getUser()).data.user;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    // Add user message to UI
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Save user message to Supabase
    await supabase.from("Aimessages").insert([
      {
        sender: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
        user_id: currentUser?.id,
      },
    ]);

    // Typing animation
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "<TypingBubbles />", timestamp: new Date().toISOString() },
    ]);

    try {
      // 1️⃣ Fetch user's presummary
      const { data: presummaryData } = await supabase
        .from("user_presummary")
        .select("presummary_text")
        .eq("user_id", currentUser?.id)
        .single();

      const cachedSummary = presummaryData?.presummary_text || "No user summary available.";

      // 2️⃣ Build systemMessage for AI context
      const systemMessage = `
You are a personal AI assistant for the Medrae Medical Network.

The user has the following profile (presummary):
${cachedSummary}

Your instructions:
1. Always greet the user by their name, extracted from the presummary.
2. Use the presummary to answer any questions about the user, including:
   - Calendar events, daily posts, notifications
   - Progress records
   - Questions answered (Qfeed_seen)
   - Notes on questions (Question_notes)
   - Quiz attempts and results
   - Simulation results
   - AI messages (Aimessages)
   - Daily trivia attempts and latest score
3. When responding, use the actual numbers and recent activity from the presummary.
4. Provide personalized advice and encouragement based on user activity:
   - Suggest reviewing weak quiz topics if Quiz_results are low
   - Encourage daily trivia participation if attempts are low
   - Highlight recent AIMessages or posts if relevant
   - Guide user on their study streaks or notifications
5. Never invent user-specific data; only use what's in the presummary.
6. Respond naturally in a friendly, supportive, and helpful tone.
7. Integrate platform knowledge when relevant, but prioritize presummary personalization.
8. When the user asks about their achievements, summarize counts and results clearly.
9. If giving suggestions, reference their course, block, institution, or subscription type when available.
10. Always end your response in a positive, encouraging tone.

User's message: ${input}
`;

      // 3️⃣ Call AI function with presummary and systemMessage
      let aiContent = "";
      try {
        const { data, error } = await supabase.functions.invoke("medrae-ai-chat", {
          body: {
            message: input,
            user_id: currentUser?.id,
            presummary: cachedSummary,
            systemMessage, // ← always send systemMessage
          },
        });
        if (error) throw error;

        aiContent = data?.reply || "Oops! Could not generate a response.";
      } catch (err) {
        console.error("AI function failed, using systemMessage fallback:", err);
        // fallback: use systemMessage as content
        aiContent = systemMessage;
      }

      // 4️⃣ Replace typing indicator with AI response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.content === "<TypingBubbles />"
            ? { ...msg, content: aiContent }
            : msg
        )
      );

      // 5️⃣ Save AI response to Supabase
      await supabase.from("Aimessages").insert([
        {
          sender: "assistant",
          content: aiContent,
          timestamp: new Date().toISOString(),
          user_id: currentUser?.id,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.content === "<TypingBubbles />"
            ? { ...msg, content: "Oops! You seem offline. Connect to the internet first." }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };



  // Delete chat history
  const deleteChat = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete all chat messages? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      await supabase.from("Aimessages").delete().eq("user_id", currentUser?.id);
      setMessages([]);
      alert("All messages deleted.");
    } catch (error) {
      console.error("Error deleting messages:", error);
      alert("Failed to delete messages.");
    }
  };
  {
    isHistoryLoading && (
      <div className="absolute bottom-6 right-6">
        <GlobalLoader message="Loading chat history..." />
      </div>
    )
  }


  return (
    <>

      {!open && (
        <Button
          className="fixed bottom-24 right-6 rounded-full p-6 shadow-lg bg-blue-600 hover:bg-blue-700 text-white float-button z-[9999]"
          onClick={() => {
            vibrate(50);
            setOpen(true);
          }}
        >
          <MessageCircle size={48} className="drop-shadow-xl text-white" />
        </Button>


      )}



      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-end px-0 pb-24"


        >
          <Card
            className={`w-full sm:w-96 shadow-2xl border rounded-2xl pointer-events-auto

        ${isDarkTheme ? "bg-gray-900 border-gray-800" : "bg-white border-gray-300"}`}
          >


            <CardHeader className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Stethoscope size={20} />
                <h3 className="font-semibold">Medrae AI Assistance</h3>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:bg-red-100"
                  onClick={() => {
                    vibrate(50); // ✅ vibrate
                    deleteChat();
                  }}
                >
                  <Trash2 size={20} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-gray-200"
                  onClick={() => {
                    vibrate(50); // ✅ vibrate
                    setOpen(false);
                  }}
                >
                  <X size={20} />
                </Button>

              </div>
            </CardHeader>

            <CardContent
              className={`flex flex-col h-96 p-2 overflow-hidden rounded-xl ${isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"
                }`}
            >

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 mb-2 p-2
             scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              >

                {messages.map((msg, idx) => {
                  const formattedTime = new Date(msg.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  const isTyping = msg.content === "<TypingBubbles />";

                  return (
                    <div key={idx}>
                      {msg.role === "user" ? (
                        <div className="flex flex-col items-end">
                          <div className="flex items-end gap-2">
                            <div className="p-2 bg-blue-500 text-white rounded-full">
                              <MessageCircle size={24} className="text-white drop-shadow-xl" />
                            </div>
                            <div className="p-2 rounded-xl max-w-[95%] shadow bg-blue-500 text-white">
                              {stripMarkdown(msg.content)}
                            </div>
                          </div>
                          <span className="text-xs text-green-400 font-semibold drop-shadow-[0_0_4px_#22c55e] mt-1">
                            {formattedTime}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-teal-600 text-white rounded-full">
                              <Stethoscope size={24} className="text-white drop-shadow-xl" />
                            </div>
                            <div className="p-2 rounded-xl max-w-[95%] shadow bg-teal-100 text-teal-900">
                              {isTyping ? <FloatingTypingBubbles isDarkTheme={isDarkTheme} /> : stripMarkdown(msg.content)}
                            </div>
                          </div>
                          <span className="text-xs text-green-400 font-semibold drop-shadow-[0_0_4px_#22c55e] mt-1">
                            {formattedTime}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Nursing..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="
  bg-white text-gray-900 placeholder-gray-400
  dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400
  border border-blue-300 dark:border-gray-700
  focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500
"

                />
                <Button
                  onClick={() => {
                    vibrate(50); // ✅ vibrate
                    sendMessage();
                  }}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send size={24} className="text-white drop-shadow-lg" />
                </Button>

              </div>
            </CardContent>
          </Card>
        </div>
      )}


    </>
  );
}
