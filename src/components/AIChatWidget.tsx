"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

type Message = {
  role: string;
  content: string;
  timestamp: string;
};

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ Auto-scroll whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // ✅ Send message to backend
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
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "⚠️ Error: Unable to connect to server.",
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
      <div className="p-2 rounded-xl max-w-[75%] shadow bg-blue-500 text-white">
        {msg.content}
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
                          <div className="p-2 rounded-xl max-w-[75%] shadow bg-teal-100 text-teal-900">
                            {msg.content}
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
                  <div className="p-2 rounded-xl bg-teal-200 text-teal-900 max-w-[75%] shadow">
                    ❤️ Heartique is generating full reply… in a few just few second...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about medicine..."
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
