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
  const bubbleColor = isDarkTheme ? "bg-green-400" : "bg-green-600";
  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
      <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
      <style jsx>{`
        .animate-bounceDelay { animation: bounce 1.2s infinite; }
        .animate-bounceDelay200 { animation: bounce 1.2s infinite 0.2s; }
        .animate-bounceDelay400 { animation: bounce 1.2s infinite 0.4s; }
        @keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

export default function OverlayAI({ isOpen, onClose, prefillQuestion }: OverlayAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState(prefillQuestion || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Supabase: Load chat history when overlay opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
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

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Save user message to Supabase
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

  const { data, error } = await supabase.functions.invoke("medrae-ai-chat", {
    body: { message: inputMessage, user_id: currentUser?.id }, // updated
  });

  if (error) throw error;

  setTimeout(async () => {
    const aiContent = data?.reply || "Oops! Could not generate response.";

    setMessages(prev =>
      prev.map(msg => msg.id === typingMessage.id ? { ...msg, content: aiContent } : msg)
    );

    // Save AI reply to Supabase
    try {
      if (currentUser?.id) {
        await supabase.from("Aimessages").insert([{
          content: aiContent,
          sender: "ai",
          timestamp: new Date(),
          user_id: currentUser.id, // updated
        }]);
      }
    } catch (err) {
      console.error("Supabase insert AI message error:", err);
    }
  }, 1200);

} catch (error) {
  console.error(error);
  setMessages(prev => [
    ...prev,
    {
      id: (Date.now() + 2).toString(),
      content: "Error: Unable to connect to server.",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
} finally {
  setIsLoading(false);
}
  };
  if (!isOpen) return null;

  const aiBubbleClass = isDarkTheme
    ? "bg-green-700 text-white"
    : "bg-green-100 text-green-900";
  const userBubbleClass = isDarkTheme ? "bg-blue-600 text-white" : "bg-blue-500 text-white";

  return (
  <div className="fixed top-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black bg-opacity-50
  lg:left-[250px] lg:w-[calc(100%-250px)]">

      <Card className="w-[95%] max-w-lg h-[80%] flex flex-col relative">
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

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shadow ${
                  msg.sender === "user"
                    ? "bg-blue-200 dark:bg-blue-700"
                    : "bg-green-200 dark:bg-green-700"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                ) : (
                  <Stethoscope className="w-5 h-5 text-green-600 dark:text-green-300" />
                )}
              </div>
              <div
                className={`rounded-2xl px-3 py-2 max-w-[80%] break-words ${
                  msg.sender === "user" ? userBubbleClass : aiBubbleClass
                } ${msg.pinned ? "ring-2 ring-yellow-400 dark:ring-yellow-300" : ""}`}
              >
                {msg.content === "<TypingBubbles />" ? (
                  <TypingBubbles isDarkTheme={isDarkTheme} />
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 p-2 border-t border-gray-300 dark:border-gray-600">
          <textarea
            placeholder="Type your question..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            className={`flex-1 p-2 rounded resize-y break-words overflow-y-auto
              ${isDarkTheme 
                ? "border border-gray-600 bg-gray-800 text-white placeholder-gray-400" 
                : "border border-gray-300 bg-white text-black placeholder-gray-700"}
              focus:outline-none focus:ring-2 focus:ring-green-500`}
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
