"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Stethoscope, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Back button / close alert
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isOpen) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOpen, inputMessage]);

const [dontAskAgain, setDontAskAgain] = useState<boolean>(
  localStorage.getItem("aiOverlayDontAskAgain") === "true"
);

const handleClose = () => {
  if (!dontAskAgain) {
    // Ask user before closing
    const confirmClose = window.confirm(
      "Are you sure you want to close the AI overlay? You have unsent text."
    );

    if (!confirmClose) return;

    // Option to skip this alert next time
    const dontAsk = window.confirm("Do you want to skip this warning in the future?");
    if (dontAsk) {
      localStorage.setItem("aiOverlayDontAskAgain", "true");
      setDontAskAgain(true);
    }
  }

  onClose(); // Close overlay
};


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
      content: "<TypingBubbles />",
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
              ? { ...msg, content: `${data?.reply || "Oops! Could not generate response."}` }
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

  const aiBubbleClass = isDarkTheme ? "bg-green-700 text-white" : "bg-green-100 text-green-900";
  const userBubbleClass = "bg-blue-500 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-[95%] max-w-lg h-[80%] flex flex-col relative">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-900"
        >
          ✕
        </button>
        <div className="flex items-center gap-2 p-2 border-b">
          <Brain className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-bold">AI Assistant</h2>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-200 shadow">
                {msg.sender === "user" ? (
                  <User className="w-5 h-5 text-blue-600" />
                ) : (
                  <Stethoscope className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className={`rounded-2xl px-3 py-2 max-w-[80%] ${msg.sender === "user" ? userBubbleClass : aiBubbleClass}`}>
                {msg.content === "<TypingBubbles />" ? <TypingBubbles isDarkTheme={isDarkTheme} /> : <ReactMarkdown>{msg.content}</ReactMarkdown>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-2 border-t">
         <textarea
  placeholder="Type your question..."
  value={inputMessage}
  onChange={(e) => setInputMessage(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
  className="flex-1 p-2 border rounded resize-y whitespace-pre-wrap break-words overflow-y-auto"
  rows={4}
/>

          <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
