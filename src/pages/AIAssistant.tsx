"use client";
import { GlobalLoader } from "@/components/GlobalLoader"; // ⬅️ adjust path if needed

import { useState, useRef, useEffect } from "react";
import {
  Send,
  User,
  Sparkles,
  Trash2,
  BookOpen,
  Pill,
  Heart,
  ShoppingBag,
  Brain,
  Stethoscope,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown"; // ⬅️ add at top of file
interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  typing?: boolean; // ← new flag
}
// 🔑 Supabase Project Keys
import { supabase } from "@/lib/supabaseClient";
function TypingBubbles({ isDarkTheme }: { isDarkTheme: boolean }) {
  const bubbleColor = isDarkTheme ? "bg-gray-400" : "bg-gray-500";


  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
    </div>
  );
}




export function AIAssistant() {
  const pinnedMessage: Message = {
    id: "pinned",
    sender: "ai",
    content: "❤️Hello! I'm your AI Study Assistant. I'm here to help with nursing concepts, drug info, and study tips. How can I assist you today?",
    timestamp: new Date(0), // very old date ensures it stays at top
  };
  const handleDeleteChat = async () => {
    const confirmDelete = window.confirm(
      " Are you sure you want to delete all chat messages? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      // Delete all messages from Supabase
      const currentUser = (await supabase.auth.getUser()).data.user;

      await supabase
        .from('Aimessages')
        .delete()
        .eq('user_id', currentUser?.id); // ← only delete messages of current user


      // Clear local state (keep pinned message visible)
      setMessages([]);
      alert("All chat messages have been deleted.");
    } catch (error) {
      console.error("Error deleting chat messages:", error);
      alert(" Failed to delete messages. Check your connection.");
    }
  };


  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Key for localStorage
  const localKey = "aiChatHistory";

  // Load cached messages if available (safe for browser)
  const cached = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;

  // Initialize state using cache
  const [messages, setMessages] = useState<Message[]>(cached ? JSON.parse(cached) : []);
  const [isHistoryLoading, setIsHistoryLoading] = useState(!cached);

  const quickQuestions = [
    "Explain hypertension pathophysiology",
    "What are the 5 rights of medication administration?",
    "Help me understand diabetes management",
    "Quiz me on cardiac medications",
    "Explain infection control principles",
    "What are nursing assessment techniques?",
  ];
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    // 1️⃣ Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Save user message to Supabase
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (currentUser?.id) {
        await supabase.from("Aimessages").insert([
          {
            sender: userMessage.sender,
            content: userMessage.content,
            timestamp: userMessage.timestamp,
            user_id: currentUser.id,
          },
        ]);
      }

      // 2️⃣ Typing bubble placeholder
      const typingMessage: Message = {
        id: (Date.now() + 0.1).toString(),
        content: "<TypingBubbles />",
        sender: "ai",
        timestamp: new Date(),
        typing: true,
      };
      setMessages((prev) => [...prev, typingMessage]);

      // 3️⃣ Fetch user's presummary
      const { data: presummaryData } = await supabase
        .from("user_presummary")
        .select("presummary_text")
        .eq("user_id", currentUser?.id)
        .single();

      const cachedSummary = presummaryData?.presummary_text || "No user summary available.";

      // 4️⃣ Build hand-coded systemMessage (exactly preserved)
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

      // 5️⃣ Stream AI response like OverlayAI
      let aiContent = "";
      try {
        const response = await fetch(
          "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/medrae-ai-chat-stream",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: inputMessage,
              user_id: currentUser?.id,
              presummary: cachedSummary,
              systemMessage,
            }),
          }
        );

        if (!response.body) throw new Error("No response body from AI stream");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Live token streaming
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          aiContent += chunk;

          // Update typing placeholder
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === typingMessage.id ? { ...msg, content: aiContent } : msg
            )
          );
        }
      } catch (err) {
        console.error("Streaming AI error, using systemMessage fallback:", err);
        aiContent = systemMessage; // fallback preserves all instructions
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingMessage.id ? { ...msg, content: aiContent } : msg
          )
        );
      }

      // 6️⃣ Save AI response to Supabase
      if (currentUser?.id) {
        await supabase.from("Aimessages").insert([
          {
            sender: "ai",
            content: aiContent,
            timestamp: new Date(),
            user_id: currentUser.id,
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.content === "<TypingBubbles />"
            ? {
              ...msg,
              content:
                "Oops!! Error: Unable to connect to server. Check your network connection.",
            }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };


  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  // Autoscroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // AI bubble color (light/dark theme aware)
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  // Load chat history from Supabase
  // Load chat history from Supabase with localStorage caching
  useEffect(() => {
    const localKey = "aiChatHistory";

    // 1️⃣ Load from localStorage first
    const cached = localStorage.getItem(localKey);
    if (cached) {
      setMessages(JSON.parse(cached));
      setIsHistoryLoading(false); // hide loader immediately if we have cached history
    }

    // 2️⃣ Fetch latest from Supabase silently
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('Aimessages')
          .select('*')
          .order('timestamp', { ascending: true });

        if (error) throw error;

        let finalMessages =
          data?.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
          })) || [];

        // Only add pinned message if no messages exist
        const pinnedMessage: Message = {
          id: "pinned",
          sender: "ai",
          content:
            "❤️Hello! I'm your AI Study Assistant. I'm here to help with nursing concepts, drug info, study tips, and answer any questions you have about your coursework. How can I assist you today?",
          timestamp: new Date(0),
        };

        if (finalMessages.length === 0) {
          finalMessages = [pinnedMessage];
        } else if (!finalMessages.find(msg => msg.id === "pinned")) {
          finalMessages = [pinnedMessage, ...finalMessages];
        }

        // Update state AND localStorage
        setMessages(finalMessages);
        localStorage.setItem(localKey, JSON.stringify(finalMessages));
      } catch (err) {
        console.error('Error fetching chat messages:', err);
      }
      // Don't set isHistoryLoading here if we already loaded from localStorage
      if (!cached) setIsHistoryLoading(false);
    };

    fetchMessages();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkTheme(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // AI = neutral grey
  const aiBubbleClass = isDarkTheme
    ? "bg-gray-700 text-gray-100"
    : "bg-gray-100 text-gray-900";

  // User = light blue
  const userBubbleClass = "bg-blue-100 text-blue-900";

  if (isHistoryLoading) {
    return <GlobalLoader message="Loading chat history..." />;
  }

  return (
    <div className="h-screen flex flex-col w-full">


      {/* Header */}
      <div className="w-full flex items-center gap-3 p-4 bg-background border-b shadow-sm">

        <div className="h-10 w-10 bg-gradient-medical rounded-full flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Medrae AI Study Assistant</h1>
          <p className="text-muted-foreground">Your personal nursing education companion</p>
        </div>
        <Badge className="ml-auto">Powered by AI</Badge>

      </div>

      {/* Layout: Sidebar + Chat */}
      <div className="flex flex-1 gap-4 overflow-hidden">


        {/* Chat */}
        <Card className="flex-1 flex flex-col h-full w-full overflow-hidden relative rounded-none">

          {/* Quick Topics Dropdown (inside chat card, below heading) */}
          <div
            className={`px-4 py-2 border-b bg-background shadow-sm mb-2 flex justify-start relative`}
          >
            <div
              className={`absolute inset-0 rounded-md border-2 border-blue-400 pointer-events-none
      ${isLoading ? 'animate-pulse-outline' : 'opacity-0'}`}
            ></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105 w-10 h-10 p-0 relative">
                  < Sparkles className="w-4 h-4 absolute inset-0 m-auto transition-opacity duration-300 hover:opacity-0" />
                  <ShoppingBag className="w-4 h-4 absolute inset-0 m-auto opacity-0 transition-opacity duration-300 hover:opacity-100" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                {quickQuestions.map((q, i) => (
                  <DropdownMenuItem key={i} onClick={() => handleQuickQuestion(q)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {i % 4 === 0 && <Heart className="h-4 w-4 text-red-500" />}
                      {i % 4 === 1 && <Pill className="h-4 w-4 text-blue-500" />}
                      {i % 4 === 2 && <BookOpen className="h-4 w-4 text-green-500" />}
                      {i % 4 === 3 && <Brain className="h-4 w-4 text-purple-500" />}
                      <span className="text-sm">{q}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Delete button floating at top-right */}
            <div className="flex w-full">
              <Button
                onClick={handleDeleteChat}
                variant="ghost"
                className="mt-3 p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 mb-2 p-2 custom-scrollbar relative"
          >
            {isHistoryLoading ? (
              <div className="absolute inset-0 flex justify-center items-center">
                <TypingBubbles isDarkTheme={isDarkTheme} />
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end text-right" : "justify-start"
                    }`}
                >
                  {/* Message Bubble */}
                  <div className="flex flex-col w-full">
                    <div

                      className={`break-words ${msg.sender === "user"
                        ? `${userBubbleClass} ml-auto px-4 py-2 rounded-lg inline-block max-w-full lg:max-w-[70%]`
                        : "inline-block max-w-full lg:max-w-[70%] text-gray-900"
                        }`}
                    >

                      {msg.content === "<TypingBubbles />" ? (
                        <TypingBubbles isDarkTheme={isDarkTheme} />
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                    <span
                      className={`text-xs text-gray-500 mt-1
      ${msg.sender === "user" ? "text-right" : "text-left"}`}
                    >
                      {new Date(msg.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>



                </div>
              ))
            )}
          </div>


          {/* Input */}
          <div className="flex items-center gap-2 p-4 border-t bg-background w-full">

            <Input
              placeholder="Ask me anything about nursing..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 border-blue-300 focus:ring-blue-500 h-10"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              variant="ghost"
              className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
