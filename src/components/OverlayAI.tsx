"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Stethoscope, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabaseClient";

interface OverlayAIProps {
  isOpen: boolean;
  onClose: () => void;
  prefillQuestion?: string;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  pinned?: boolean;
}

function TypingBubbles({ isDarkTheme }: { isDarkTheme: boolean }) {
  const bubbleColor = isDarkTheme ? "bg-gray-500" : "bg-gray-400"; // AI grey

  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
    </div>
  );
}



export default function OverlayAI({ isOpen, onClose, prefillQuestion }: OverlayAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState(prefillQuestion || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Supabase: Load chat history when overlay opens with loader
  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setLoadingHistory(true); // start loader
      try {
        const userResponse = await supabase.auth.getUser();
        const userId = userResponse.data.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from("Aimessages")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setMessages(data.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
          })));
        } else {
          // Add pinned welcome AI message if no history
          const initialMessage = {
            content: "Hey, I noticed you needed me! Feel free to ask any question.",
            sender: "ai",
            timestamp: new Date(),
            pinned: true,
            user_id: userId,
          };
          const { data: insertedData } = await supabase
            .from("Aimessages")
            .insert([initialMessage])
            .select();

          if (insertedData) {
            setMessages(insertedData.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              timestamp: new Date(msg.timestamp),
              pinned: true,
            })));
          }
        }
      } catch (err) {
        console.error("Supabase fetch error:", err);
      } finally {
        setLoadingHistory(false); // stop loader
      }
    };

    fetchHistory();
  }, [isOpen]);


  // Update input when prefill changes
  useEffect(() => setInputMessage(prefillQuestion || ""), [prefillQuestion]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Detect theme
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkTheme(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const handleClose = () => {
    onClose();
  };


  const confirmClose = () => {
    onClose();
    setShowCloseConfirm(false);
  };

  const cancelClose = () => setShowCloseConfirm(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);

    const timestamp = new Date();
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp,
    };

    // 1️⃣ Add user message to UI
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // 2️⃣ Save user message to Supabase
    try {
      const userResponse = await supabase.auth.getUser();
      const userId = userResponse.data.user?.id;
      if (userId) {
        await supabase.from("Aimessages").insert([{
          content: userMessage.content,
          sender: "user",
          timestamp: userMessage.timestamp,
          user_id: userId,
        }]);
      }
    } catch (err) {
      console.error("Supabase insert user message error:", err);
    }

    // 3️⃣ Add AI typing indicator
    const typingMessage: Message = {
      id: (Date.now() + 0.1).toString(),
      content: "<TypingBubbles />",
      sender: "ai",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const userResponse = await supabase.auth.getUser();
      const currentUser = userResponse.data.user;

      // 4️⃣ Fetch user's presummary
      const { data: presummaryData } = await supabase
        .from("user_presummary")
        .select("presummary_text")
        .eq("user_id", currentUser?.id)
        .single();

      const cachedSummary = presummaryData?.presummary_text || "No user summary available.";

      // 5️⃣ Create systemMessage for AI
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

User's message: ${inputMessage}
`;

      // 6️⃣ Call AI function with presummary
      let aiContent = "";
      try {
        const { data, error } = await supabase.functions.invoke("medrae-ai-chat", {
          body: {
            message: inputMessage,
            user_id: currentUser?.id,
            presummary: cachedSummary,
            systemMessage, // ← send systemMessage too
          },
        });
        if (error) throw error;

        aiContent = data?.reply || "Oops! Could not generate a response.";
      } catch (err) {
        console.error("AI function failed, using systemMessage fallback:", err);
        // Fallback: use systemMessage as AI content
        aiContent = systemMessage;
      }

      // 7️⃣ Replace typing indicator with AI response
      setMessages(prev =>
        prev.map(msg => msg.id === typingMessage.id ? { ...msg, content: aiContent } : msg)
      );

      // 8️⃣ Save AI response to Supabase
      if (currentUser?.id) {
        await supabase.from("Aimessages").insert([{
          content: aiContent,
          sender: "ai",
          timestamp: new Date(),
          user_id: currentUser.id,
        }]);
      }

    } catch (err) {
      console.error("Error sending AI message:", err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === typingMessage.id
            ? { ...msg, content: "Error: Unable to connect to server." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const aiBubbleClass = isDarkTheme
    ? "bg-gray-700 text-white"   // AI dark: dark grey background
    : "bg-gray-100 text-gray-900"; // AI light: light grey background
  const userBubbleClass = isDarkTheme
    ? "bg-blue-100 text-blue-900"   // dark mode: dark blue
    : "bg-blue-900 text-blue-900"; // light mode: very light blue with dark text


  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-[95%] max-w-2xl h-[75vh] flex flex-col relative">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 p-2 border-b border-gray-300 dark:border-gray-600">
          <Brain className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-bold text-black dark:text-white">Medrae AI Assistant</h2>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 mb-2 p-2
     scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        >
          {loadingHistory ? (
            <div className="flex justify-center items-center w-full h-full">
              <TypingBubbles isDarkTheme={isDarkTheme} />
            </div>

          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shadow ${msg.sender === "user"
                    ? "bg-blue-100 dark:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700"
                    }`}
                >
                  {msg.sender === "user" ? (
                    <User className="w-5 h-5 text-blue-900 dark:text-white" />
                  ) : (
                    <Stethoscope className="w-5 h-5 text-green-600 dark:text-green-300" />
                  )}
                </div>

                <div
                  className={`rounded-2xl px-4 py-2 max-w-[80%] break-words ${msg.sender === "user" ? userBubbleClass : aiBubbleClass} ${msg.pinned ? "ring-2 ring-yellow-400 dark:ring-yellow-300" : ""}`}
                >
                  {msg.content === "<TypingBubbles />" ? (
                    <TypingBubbles isDarkTheme={isDarkTheme} />
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))
          )}
        </div>


        <div className="flex gap-2 p-2 border-t border-gray-300 dark:border-gray-600">
          <textarea
            placeholder="Type your question..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            className="flex-1 p-2 rounded resize-y break-words overflow-y-auto
             border border-gray-300 bg-white text-black placeholder-gray-700
             dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400
             focus:outline-none focus:ring-2 focus:ring-green-500
             custom-scrollbar" // ✅ Add this
            rows={4}
          />


          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
