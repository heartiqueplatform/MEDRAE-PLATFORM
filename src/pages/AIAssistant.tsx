"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  User,
  Sparkles,
  BookOpen,
  Pill,
  Heart,
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
      <style jsx>{`
        .animate-bounceDelay {
          display: inline-block;
          animation: bounce 1.2s infinite;
        }
        .animate-bounceDelay200 {
          display: inline-block;
          animation: bounce 1.2s infinite 0.2s;
        }
        .animate-bounceDelay400 {
          display: inline-block;
          animation: bounce 1.2s infinite 0.4s;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}



export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "❤️Hello! I'm your AI Study Assistant. I'm here to help with nursing concepts, drug information, study tips, and answer any questions you have about your coursework. How can I assist you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
const { data, error } = await supabase.functions.invoke("heartique-ai-chat", {
  body: { message: userMessage.content },
});

if (error) throw error;


      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingMessage.id
              ? {
                  ...msg,
                 content: ` ${data?.reply || "Ooops Sorry, I couldn't generate a response seems your offline.Connect to the internet and try again"}`,
                }
              : msg
          )
        );
      }, 1200);
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
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkTheme(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const aiBubbleClass = isDarkTheme ? "bg-green-700 text-white" : "bg-green-100 text-green-900";
  const userBubbleClass = "bg-blue-500 text-white";

  return (
    <div className="h-screen flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-medical rounded-full flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Heartique AI Study Assistant</h1>
          <p className="text-muted-foreground">Your personal nursing education companion</p>
        </div>
        <Badge className="ml-auto">❤️ Heartique is Powered by AI</Badge>
      </div>

      {/* Layout: Sidebar + Chat */}
      <div className="flex flex-1 gap-4 overflow-hidden">
      

        {/* Chat */}
       <Card className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        {/* Quick Topics Dropdown (inside chat card, below heading) */}
<div className="px-4 py-2 border-b bg-background shadow-sm mb-2 flex justify-start animate-bounce-slow">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg transform transition-transform duration-300 hover:scale-105">
        <Sparkles className="w-4 h-4 animate-spin-slow" />
        Quick Topics
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

  <style jsx>{`
    .animate-bounce-slow {
      animation: bounce 2s infinite;
    }
    .animate-spin-slow {
      animation: spin 4s linear infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
</div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${
                  msg.sender === "user" ? "justify-end text-right" : "justify-start"
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
  className={`rounded-2xl px-4 py-2 shadow prose prose-sm max-w-[95%] ${
    msg.sender === "user" ? userBubbleClass : aiBubbleClass
  }`}
>

 {msg.content === "<TypingBubbles />" ? <TypingBubbles isDarkTheme={isDarkTheme} /> : <ReactMarkdown>{msg.content}</ReactMarkdown>}
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
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-12 flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
