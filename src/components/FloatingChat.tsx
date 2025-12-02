"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Check } from "lucide-react";

interface Message {
  id: number;
  unit_code: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  avatar_url?: string | null;
}

interface Unit {
  id: string;
  unit_code: string;
  title: string;
}

interface FloatingChatProps {
  currentUserId: string;
}

export default function FloatingChat({ currentUserId }: FloatingChatProps) {
  const [userUnits, setUserUnits] = useState<Unit[]>([]);
  const [openChats, setOpenChats] = useState<string[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
const [collapsedChats, setCollapsedChats] = useState<string[]>([]);

  // Load all units
  const loadUserUnits = async () => {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id, unit_code, unit")
      .order("unit", { ascending: true });

    if (error) {
      console.error("Failed to load units:", error);
      return;
    }

    setUserUnits(
      (data || []).map((u: any) => ({
        id: u.id,
        unit_code: u.unit_code,
        title: u.unit || u.unit_code,
      }))
    );
  };

  useEffect(() => {
    loadUserUnits();
  }, []);

  useEffect(() => {
  // Scroll each open chat to bottom when messages change
  openChats.forEach((unit_code) => {
    if (messagesEndRefs.current[unit_code]) {
      messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
    }
  });
}, [messagesMap, openChats]);

  // Load messages
  const loadMessages = async (unit_code: string) => {
    const { data } = await supabase
      .from("unit_messages")
      .select(`*, profiles(name, avatar_url)`)
      .eq("unit_code", unit_code)
      .order("created_at", { ascending: true });

    const mappedMessages = (data || []).map((m: any) => ({
      id: m.id,
      unit_code: m.unit_code,
      user_id: m.user_id,
      content: m.content,
      created_at: m.created_at,
      sender_name: m.profiles?.name || "Unknown",
      avatar_url: m.profiles?.avatar_url || null,
    }));

    setMessagesMap((prev) => ({ ...prev, [unit_code]: mappedMessages }));
  };
  

  // Subscribe to real-time updates
  const subscribeToUnit = (unit_code: string) => {
    const channel = supabase
      .channel(`messages-${unit_code}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "unit_messages", filter: `unit_code=eq.${unit_code}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", newMsg.user_id)
            .single();

          const message = {
            id: newMsg.id,
            unit_code: newMsg.unit_code,
            user_id: newMsg.user_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            sender_name: profile?.name || "Unknown",
            avatar_url: profile?.avatar_url || null,
          };

          setMessagesMap((prev) => {
            const unitMessages = prev[unit_code] || [];
            return { ...prev, [unit_code]: [...unitMessages, message] };
          });

          // Scroll to newest message
          messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  // Open chat panel
  const openChat = (unit_code: string) => {
    if (!openChats.includes(unit_code)) {
      setOpenChats((prev) => [...prev, unit_code]);
      loadMessages(unit_code);
      subscribeToUnit(unit_code);
    }
  };

  // Send message
  const handleSend = async (unit_code: string) => {
    const input = inputMap[unit_code]?.trim();
    if (!input) return;

    const selectedUnit = userUnits.find((u) => u.unit_code === unit_code);
    if (!selectedUnit) return;

    const { data, error } = await supabase
      .from("unit_messages")
      .insert([{
        unit_id: selectedUnit.id,
        unit_code: selectedUnit.unit_code,
        user_id: currentUserId,
        content: input
      }])
      .select();

    if (error) {
      console.error("Failed to send message:", error);
      return;
    }
if (data && data.length > 0) {
  const newMsg = data[0];
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("user_id", currentUserId)
    .single();

  const message = {
    id: newMsg.id,
    unit_code: newMsg.unit_code,
    user_id: newMsg.user_id,
    content: newMsg.content,
    created_at: newMsg.created_at,
    sender_name: profile?.name || "You",
    avatar_url: profile?.avatar_url || null,
  };

  setMessagesMap((prev) => {
    const unitMessages = prev[unit_code] || [];
    return { ...prev, [unit_code]: [...unitMessages, message] };
  });
// Scroll to newest message after sending
setTimeout(() => {
  messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
}, 50);
  // Play notification sound
  const audio = new Audio("/sounds/notification.mp3");
  audio.play().catch((err) => console.warn("Sound play failed:", err));
}


    setInputMap((prev) => ({ ...prev, [unit_code]: "" }));
  };


  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 items-end z-50">
      {/* Unit Selector */}
      <div className="bg-card p-2 rounded-lg shadow w-80">
        <select
          className="border rounded p-1 w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          onChange={(e) => openChat(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Select a unit...</option>
          {userUnits.map((unit) => (
            <option key={unit.unit_code} value={unit.unit_code}>
              {unit.title}
            </option>
          ))}
        </select>
      </div>

      {/* Open Chat Panels */}
     <div className="flex flex-col md:flex-row gap-2 max-w-screen-md overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">

        {openChats.map((unit_code) => {
          const messages = messagesMap[unit_code] || [];
          const input = inputMap[unit_code] || "";
          return (
            <div
              key={unit_code}
              className="w-80 h-96 bg-card shadow-xl rounded-xl flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Header */}
              <CardHeader className="border-b px-2 py-1 flex items-start justify-between">
                <CardTitle className="text-sm font-medium leading-tight">
                  Unit Chat: {userUnits.find((u) => u.unit_code === unit_code)?.title || unit_code}
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-2 mt-0.5 p-1"
                  onClick={() => setOpenChats((prev) => prev.filter((code) => code !== unit_code))}
                >
                  ✕
                </Button>
              </CardHeader>

              {/* Messages */}
        <ScrollArea className="flex-1 overflow-y-auto mb-2 p-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans text-sm">
  <ul className="flex flex-col gap-2">
    {messages.map((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const isSameSender = prevMsg && prevMsg.user_id === msg.user_id;

      return (
        <li
          key={msg.id}
          className={`flex items-start gap-2 ${
            msg.user_id === currentUserId ? "justify-end" : "justify-start"
          } ${isSameSender ? "mt-1" : "mt-3"}`}
        >
          {/* Avatar only for other users and first message in block */}
          {msg.user_id !== currentUserId && !isSameSender && (
            <Avatar className="h-8 w-8">
              {msg.avatar_url ? (
                <img src={msg.avatar_url} alt={msg.sender_name} />
              ) : (
                <AvatarFallback>{msg.sender_name?.[0]}</AvatarFallback>
              )}
            </Avatar>
          )}

          <div
            className={`px-3 py-2 rounded-lg break-words ${
              msg.user_id === currentUserId
                ? "bg-blue-600 text-white rounded-tr-none max-w-[75%]"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none max-w-[75%]"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                msg.user_id === currentUserId ? "text-white" : "text-blue-500"
              }`}
            >
              {msg.sender_name} says
            </p>

            <p className="text-sm">{msg.content}</p>

            {/* Metadata */}
            <div
              className={`mt-1 flex justify-end items-center gap-1 text-[10px] ${
                msg.user_id === currentUserId ? "text-green-400" : "text-green-200"
              }`}
            >
              {msg.user_id === currentUserId && (
                <span className="flex gap-[1px]">
                  <Check className="h-3 w-3 text-green-400" />
                  <Check className="h-3 w-3 text-green-400" />
                </span>
              )}
              <span>
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="ml-1">
                {new Date(msg.created_at).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </li>
      );
    })}
    <li ref={(el) => (messagesEndRefs.current[unit_code] = el)} />
  </ul>
</ScrollArea>


              {/* Input */}
              <div className="border-t p-2 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) =>
                    setInputMap((prev) => ({ ...prev, [unit_code]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend(unit_code);
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={() => handleSend(unit_code)} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
