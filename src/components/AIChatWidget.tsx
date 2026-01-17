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
type AIChatWidgetProps = {
  isDarkTheme: boolean;
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
export default function AIChatWidget({ isDarkTheme }: AIChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vibrate = (duration: number = 50) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  };
  const bubbleColor = isDarkTheme ? "bg-teal-400" : "bg-teal-600";
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
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);
  const sendMessage = async () => {
    if (!input.trim()) return;
    const currentUser = (await supabase.auth.getUser()).data.user;
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    await supabase.from("Aimessages").insert([
      {
        sender: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
        user_id: currentUser?.id,
      },
    ]);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "<TypingBubbles />", timestamp: new Date().toISOString() },
    ]);
    try {
      const { data: presummaryData } = await supabase
        .from("user_presummary")
        .select("presummary_text")
        .eq("user_id", currentUser?.id)
        .single();
      const cachedSummary = presummaryData?.presummary_text || "No user summary available.";
      const now = new Date();
      const systemMessage = `
You are a personal AI assistant for the Medrae Medical Network.
Current date and time: ${now.toUTCString()}
IMPORTANT: Always start every response by addressing the user by their name, extracted from the presummary.
Even for the very first message, the AI must greet the user by name and never wait for additional prompts.

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
`
      let aiContent = "";
      try {
        const { data, error } = await supabase.functions.invoke("medrae-ai-chat", {
          body: {
            message: input,
            user_id: currentUser?.id,
            presummary: cachedSummary,
            systemMessage,
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
          className="fixed bottom-24 right-6 rounded-full p-6 shadow-lg
    bg-blue-600 hover:bg-blue-700 text-white
    z-30" // ✅ lower, safe z-index

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
          className={`fixed inset-0 z-50 flex items-end justify-end px-0 pb-24
    ${isDarkTheme ? "bg-black/40" : "bg-black/10"}`}
        >
          <Card
            className={`w-full sm:w-96 shadow-2xl rounded-2xl border-0
    ${isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"}
  `}
          >
            <CardHeader className={`flex justify-between items-center p-3 rounded-t-2xl ${isDarkTheme ? "bg-gray-800 text-white" : "bg-blue-600 text-white"}`}
            >
              <div className="flex items-center gap-0">
                <Stethoscope size={20} />
                <h3 className="font-semibold">Medrae AI Assistance</h3>
              </div>
              <div className="flex gap-0">
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
              className={`flex flex-col h-96 p-1 overflow-hidden rounded-xl ${isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
            >
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 mb-2 p-2
     scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent relative"
              >
                {isHistoryLoading ? (
                  <div className="absolute inset-0 flex justify-center items-center">
                    <FloatingTypingBubbles isDarkTheme={isDarkTheme} />
                  </div>
                ) : (
                  messages.map((msg, idx) => {
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
                            <div className={`p-2 rounded-xl max-w-[80%] break-words shadow
  ${isDarkTheme ? "bg-blue-900 text-blue-100" : "bg-blue-100 text-blue-900"}`}>
                              {stripMarkdown(msg.content)}
                            </div>
                            <span className="text-xs text-green-400 font-semibold drop-shadow-[0_0_4px_#22c55e] mt-1">
                              {formattedTime}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start w-full">
                            <div className={`p-2 rounded-xl w-full sm:max-w-[100%] break-words shadow
  ${isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"} font-medium text-sm`}>
                              {isTyping ? <FloatingTypingBubbles isDarkTheme={isDarkTheme} /> : stripMarkdown(msg.content)}
                            </div>
                            <span className="text-xs text-green-400 font-semibold drop-shadow-[0_0_4px_#22c55e] mt-1">
                              {formattedTime}
                            </span>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Nursing..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className={`${isDarkTheme
                    ? "bg-gray-800 text-white placeholder-gray-400 border-gray-700 focus:ring-teal-500"
                    : "bg-white text-gray-900 placeholder-gray-400 border-blue-300 focus:ring-blue-500"
                    }`}
                />
                <Button
                  onClick={() => {
                    vibrate(50);
                    sendMessage();
                  }}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
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
