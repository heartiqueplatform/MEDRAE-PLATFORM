"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  role: string;
  content: string;
  timestamp: string;
};

function FloatingTypingBubbles({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${isDarkTheme ? 'bg-teal-400' : 'bg-teal-600'} animate-float1`}></span>
      <span className={`w-2 h-2 rounded-full ${isDarkTheme ? 'bg-teal-400' : 'bg-teal-600'} animate-float2`}></span>
      <span className={`w-2 h-2 rounded-full ${isDarkTheme ? 'bg-teal-400' : 'bg-teal-600'} animate-float3`}></span>

      <style jsx>{`
        @keyframes float {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .animate-float1 { animation: float 1.2s infinite; }
        .animate-float2 { animation: float 1.2s infinite 0.2s; }
        .animate-float3 { animation: float 1.2s infinite 0.4s; }
      `}</style>
    </div>
  );
}
function stripMarkdown(text: string): string {
  return text
    // Bold & italic (**text**, *text*, _text_, ***text***)
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")

    // Headings (#, ##, ###, etc.)
    .replace(/^#{1,6}\s*/gm, "")

    // Blockquotes (>)
    .replace(/^\s*>+\s?/gm, "")

    // Inline code (`code`)
    .replace(/`([^`]+)`/g, "$1")

    // Fenced code blocks (```lang ... ```)
    .replace(/```[\s\S]*?```/g, "")

    // Links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

    // Images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")

    // Lists (-, *, +, 1.)
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")

    // Horizontal rules (---, ***)
    .replace(/^([-*]_?){3,}$/gm, "")

    // Extra spaces
    .replace(/\s+/g, " ")
    .trim();
}


export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  setIsDarkTheme(media.matches);
  const listener = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
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

  // Send message to backend
  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input, timestamp: new Date().toISOString() },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("heartique-ai-chat", {
  body: { message: input },
});

if (error) {
  throw error;
}

setMessages([
  ...newMessages,
  {
    role: "assistant",
    content: data?.reply || "Ooops Sorry, I couldn't generate a response seems your offline.Connect to the internet and try again.",
    timestamp: new Date().toISOString(),
  },
]);

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Ooops your Offline connect to network first.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <Button
  className="fixed bottom-6 right-6 rounded-full p-6 shadow-lg bg-blue-600 hover:bg-blue-700 text-white animate-bounce"
  onClick={() => setOpen(true)}
>
  <MessageCircle size={48} className="drop-shadow-xl text-white" />
</Button>
      )}
      {/* Chat Window */}
      {open && (
        <Card
          className="fixed bottom-6 right-6 w-80 shadow-2xl border border-blue-300 rounded-2xl
                     bg-[url('/background1.jpeg')] bg-cover bg-center"
        >
          <CardHeader className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Stethoscope size={20} />
              <h3 className="font-semibold">Heartique AI Assistance</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-blue-700"
              onClick={() => setOpen(false)}
            >
            <X size={24} className="text-white drop-shadow-lg" />

            </Button>
          </CardHeader>

      <CardContent className="flex flex-col h-96 bg-white/10 backdrop-blur-sm">

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-3 mb-2 p-2"
            >
              {messages.map((msg, idx) => {
                const formattedTime = new Date(msg.timestamp).toLocaleString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                );

                return (
                  <div key={idx}>
{msg.role === "user" ? (
  <div className="flex flex-col items-end">
    <div className="flex items-end gap-2">
      {/* User profile icon */}
      <div className="p-2 bg-blue-500 text-white rounded-full">
        <MessageCircle size={24} className="text-white drop-shadow-xl" />
      </div>

      {/* User message bubble */}
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
                       {stripMarkdown(msg.content)}

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
{loading && (
  <div className="flex items-start gap-2">
    <div className="p-2 bg-teal-600 text-white rounded-full">
      <Stethoscope size={24} className="text-white drop-shadow-xl" />
    </div>
    <div className="p-2 rounded-xl bg-teal-200 text-teal-900 max-w-[75%] shadow flex items-center">
      <FloatingTypingBubbles isDarkTheme={isDarkTheme} />
    </div>
  </div>
)}


            </div>

            {/* Input */}
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Nursing..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="border-blue-300 focus:ring-blue-500"
              />
              <Button
                onClick={sendMessage}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
               <Send size={24} className="text-white drop-shadow-lg" />

              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
