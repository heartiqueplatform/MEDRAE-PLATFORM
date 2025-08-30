"use client";

import { useState } from "react";
import { generateAIResponse } from "../generateAIResponse";

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string) => {
    const userMessage: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const aiReply = await generateAIResponse(message);
      const aiMessage: ChatMessage = { role: "ai", content: aiReply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    loading,
  };
};
