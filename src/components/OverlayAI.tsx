"use client";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabaseClient";
import React, { useState, useEffect, useRef } from "react";
import { X, Brain, Send, Sparkles, User, Stethoscope, Copy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
  //  Check if chat has real messages (ignore pinned)
  const hasRealMessages = messages.some(
    (m) => !m.pinned
  );

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

    try {
      const userResponse = await supabase.auth.getUser();
      const currentUser = userResponse.data.user;

      // 2️⃣ Save user message to Supabase
      if (currentUser?.id) {
        await supabase.from("Aimessages").insert([{
          content: userMessage.content,
          sender: "user",
          timestamp: userMessage.timestamp,
          user_id: currentUser.id,
        }]);
      }

      // 3️⃣ Add AI typing indicator
      const typingMessageId = (Date.now() + 0.1).toString();
      setMessages(prev => [
        ...prev,
        { id: typingMessageId, content: "<TypingBubbles />", sender: "ai", timestamp: new Date() }
      ]);

      // 4️⃣ Fetch user's presummary
      const { data: presummaryData } = await supabase
        .from("user_presummary")
        .select("presummary_text")
        .eq("user_id", currentUser?.id)
        .single();

      const cachedSummary = presummaryData?.presummary_text || "No user summary available.";

      // 5️⃣ Keep all instructions exactly
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

      // 6️⃣ Streaming AI function call
      const response = await fetch(
        "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/medrae-ai-chat-stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: inputMessage, presummary: cachedSummary, systemMessage })
        }
      );

      if (!response.body) throw new Error("No response body from AI stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      // 7️⃣ Stream tokens live
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        aiContent += chunk;

        setMessages(prev =>
          prev.map(msg =>
            msg.id === typingMessageId ? { ...msg, content: aiContent } : msg
          )
        );
      }

      // 8️⃣ Save final AI response to Supabase
      if (currentUser?.id) {
        await supabase.from("Aimessages").insert([{
          content: aiContent,
          sender: "ai",
          timestamp: new Date(),
          user_id: currentUser.id,
        }]);
      }

    } catch (err) {
      console.error("Streaming AI error:", err);
      setMessages(prev =>
        prev.map(msg =>
          msg.content === "<TypingBubbles />"
            ? { ...msg, content: "Error: Unable to connect to server." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const aiBubbleClass =
    "bg-transparent text-gray-900 dark:text-gray-100";

  const userBubbleClass = isDarkTheme
    ? "bg-blue-600 text-white"
    : "bg-blue-600 text-white";


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-[85vh] flex flex-col bg-white dark:bg-gray-950 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
      >
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Brain className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-none">Medrae AI</h2>
              <span className="text-[10px] text-green-500 font-medium flex items-center gap-1 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Assistant Active
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- CHAT BODY --- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
        >
          {loadingHistory ? (
            <div className="flex flex-col justify-center items-center h-full space-y-4">
              <div className="relative">
                <div className="h-12 w-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Syncing clinical records...</p>
            </div>
          ) : !hasRealMessages ? (
            /* --- EMPTY STATE --- */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center px-4"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-3xl flex items-center justify-center shadow-lg mb-6 rotate-3">
                <Sparkles className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-2 dark:text-white">How can I help today?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8">
                Ask about nursing concepts, drug dosages, or exam prep. I'm trained on clinical guidelines.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {["Explain Heart Failure", "Dosage Calculation", "NCLEX Study Tips", "Pharmacology help"].map((tip) => (
                  <button
                    key={tip}
                    onClick={() => setInputMessage(tip)}
                    className="text-xs p-3 text-left border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-gray-600 dark:text-gray-300 hover:border-green-300"
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar icons */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === "user" ? "bg-gray-800" : "bg-green-600"
                      }`}>
                      {msg.sender === "user" ? <User className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-white" />}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${msg.sender === "user"
                          ? "bg-green-600 text-white rounded-tr-none"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700"
                          } ${msg.pinned ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {/*  FIX: DETECT TYPING BUBBLES STRING */}
                        {msg.content === "<TypingBubbles />" ? (
                          <TypingBubbles isDarkTheme={isDarkTheme} />
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Message Actions (Only for AI and only if not typing) */}
                      {msg.sender !== "user" && msg.content !== "<TypingBubbles />" && (
                        <div className="flex gap-2 px-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-500 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* --- INPUT AREA --- */}
        <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all shadow-inner">
            <textarea
              placeholder="Ask a nursing question..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              rows={1}
              className="flex-1 max-h-32 p-2 bg-transparent border-none focus:outline-none focus:ring-0 text-sm dark:text-white resize-none custom-scrollbar"
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />

            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="h-10 w-10 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 shrink-0 flex items-center justify-center transition-transform active:scale-95"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2">
            Medrae AI can make mistakes. Verify clinical decisions with a professional.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
