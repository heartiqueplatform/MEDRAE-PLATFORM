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
}
// 🔑 Supabase Project Keys
import { supabase } from "@/lib/supabaseClient";
function TypingBubbles({ isDarkTheme }: { isDarkTheme: boolean }) {
  const bubbleColor = isDarkTheme ? "bg-green-400" : "bg-green-600"; // light/dark brand colors

  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
      <style>
        {`
  @keyframes pulseOutline {
    0% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.05); opacity: 0.6; }
    100% { transform: scale(1); opacity: 0.3; }
  }

  .animate-pulse-outline {
    animation: pulseOutline 1s infinite;
  }
  `}
      </style>

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

    setMessages((prev) => [...prev, userMessage]);
    // Save user message to Supabase
    const currentUser = (await supabase.auth.getUser()).data.user;

    await supabase.from('Aimessages').insert([
      {
        sender: userMessage.sender,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
        user_id: currentUser?.id, // ← ensure row belongs to current user
      },
    ]);


    setInputMessage("");
    setIsLoading(true);

    const typingMessage: Message = {
      id: (Date.now() + 0.1).toString(),
      content: "<TypingBubbles />", // ⬅️ placeholder for bubble animation
      sender: "ai",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      const { data, error } = await supabase.functions.invoke("medrae-ai-chat", {
        body: { message: inputMessage, user_id: currentUser?.id },
      });

      if (error) throw error;


      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingMessage.id
            ? {
              ...msg,
              content: data?.reply || "Ooops Sorry, I couldn't generate a response seems your offline.Connect to the internet and try again",
            }
            : msg
        )
      );

      // Save AI message to Supabase
      (async () => {
        const currentUser = (await supabase.auth.getUser()).data.user;

        await supabase.from('Aimessages').insert([
          {
            sender: 'ai',
            content: data?.reply || "Ooops Sorry, I couldn't generate a response seems your offline.Connect to the internet and try again",
            timestamp: new Date(),
            user_id: currentUser?.id,
          },
        ]);
      })();


    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          content: "oops!! Error: Unable to connect to server check ur network connection.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
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

  const aiBubbleClass = isDarkTheme ? "bg-green-700 text-white" : "bg-green-100 text-green-900";
  const userBubbleClass = "bg-blue-500 text-white";
  if (isHistoryLoading) {
    return <GlobalLoader message="Loading chat history..." />;
  }

  return (
    <div className="h-screen flex flex-col max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
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
        <Card className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
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
            className="flex-1 overflow-y-auto space-y-3 mb-2 p-2
             scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          >


            {messages.map((msg, index) => (


              <div
                key={index}
                className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end text-right" : "justify-start"
                  }`}
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-200 shadow">
                  {msg.sender === "user" ? (
                    <User className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Stethoscope className="w-5 h-5 text-green-600" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col max-w-[95%]">
                  <div
                    className={`rounded-2xl px-4 py-2 shadow prose prose-sm max-w-[80%] break-words ${msg.sender === "user"
                      ? `${userBubbleClass} text-left` // ← bubble on right, text starts left
                      : `${aiBubbleClass} text-left`   // ← AI bubble also left-aligned text
                      }`}
                  >
                    {msg.content === "<TypingBubbles />" ? (
                      <TypingBubbles isDarkTheme={isDarkTheme} />
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                  <span className="text-xs text-gray-500 mt-1">
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
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-4 border-t bg-background flex-shrink-0">
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
