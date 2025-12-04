"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Check, MessageCircle, X, Edit2, Trash2, CornerUpLeft } from "lucide-react";
// ✅ Add these two lines for the emoji picker
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';



interface Message {
  id: number;
  unit_code: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  avatar_url?: string | null;
    replyToId?: number | null; // ✅ new property for reply tagging
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
const [showUnitSelector, setShowUnitSelector] = useState(false);
const unitPanelRef = useRef<HTMLDivElement | null>(null);
const [unitSearch, setUnitSearch] = useState("");
const chatButtonRef = useRef<HTMLButtonElement | null>(null);
const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
// ✅ Add emoji picker state
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
// Which chat’s emoji picker is active
const [activeEmojiUnit, setActiveEmojiUnit] = useState<string | null>(null);
const emojiPickerRef = useRef<HTMLDivElement | null>(null);

const [panelSizes, setPanelSizes] = useState<Record<string, { width: number; height: number }>>({}); 
// Track which message user is replying to per unit
const [replyingTo, setReplyingTo] = useState<Record<string, Message | null>>({});

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
  if (!activeEmojiUnit) return;

  const handleClickOutside = (e: MouseEvent) => {
    if (
      emojiPickerRef.current &&
      !emojiPickerRef.current.contains(e.target as Node)
    ) {
      setActiveEmojiUnit(null);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [activeEmojiUnit]);

useEffect(() => {
  if (!showEmojiPicker) return;

  const handleClickOutside = (e: MouseEvent) => {
    if (
      emojiPickerRef.current &&
      !emojiPickerRef.current.contains(e.target as Node)
    ) {
      setShowEmojiPicker(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [showEmojiPicker]);

useEffect(() => {
  if (!showUnitSelector) return;

  const handleClickOutside = (e: MouseEvent) => {
    if (
      unitPanelRef.current &&
      !unitPanelRef.current.contains(e.target as Node) &&
      chatButtonRef.current &&
      !chatButtonRef.current.contains(e.target as Node)
    ) {
      setShowUnitSelector(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [showUnitSelector]);


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
  replyToId: m.reply_to_id || null,
  replyToContent: null // ✅ placeholder for the replied message content
}));

// After mapping, fill in replyToContent
mappedMessages.forEach(msg => {
  if (msg.replyToId) {
    const repliedMsg = mappedMessages.find(m => m.id === msg.replyToId);
    if (repliedMsg) msg.replyToContent = repliedMsg.content;
  }
});


    setMessagesMap((prev) => ({ ...prev, [unit_code]: mappedMessages }));
  };
  

  // Subscribe to real-time updates
const subscribeToUnit = (unit_code: string) => {
 
const channel = supabase
  .channel(`messages-${unit_code}`)
  .on(
    "postgres_changes",
    {
      event: "*", // Listen to all events
      schema: "public",
      table: "unit_messages",
      filter: `unit_code=eq.${unit_code}`,
    },
    async (payload) => {
      const event = payload.eventType; // "INSERT", "UPDATE", "DELETE"
      const msgData = payload.new || payload.old;

      if (!msgData) return;
if (event === "INSERT") {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("user_id", msgData.user_id)
    .maybeSingle();

  if (error) console.warn("[REALTIME] profile lookup failed", error);

  // Determine replied message content
let replyToContent: string | null = null;

if (msgData.reply_to_id) {
  const allMessages = messagesMap[unit_code] || [];
  const repliedMsg = allMessages.find(m => m.id === msgData.reply_to_id);

  if (repliedMsg) {
    replyToContent = repliedMsg.content;
  } else {
    // ✅ fetch from Supabase if not already loaded
    try {
      const { data: replyData } = await supabase
        .from("unit_messages")
        .select("id, content")
        .eq("id", msgData.reply_to_id)
        .maybeSingle();

   if (replyData) {
  replyToContent = replyData.content;

  // Update the message in the messagesMap so the UI re-renders
  setMessagesMap(prev => ({
    ...prev,
    [unit_code]: (prev[unit_code] || []).map(m =>
      m.id === msgData.id ? { ...m, replyToContent } : m
    ),
  }));
}

    } catch (err) {
      console.warn("[REALTIME] Failed to fetch replied message", err);
    }
  }
}


  const message = {
    id: msgData.id,
    unit_code: msgData.unit_code,
    user_id: msgData.user_id,
    content: msgData.content,
    created_at: msgData.created_at,
    sender_name: profile?.name || "Unknown",
    avatar_url: profile?.avatar_url || null,
    deleted: msgData.deleted || false,
    replyToId: msgData.reply_to_id || null,
    replyToContent, // ✅ attach replied message content
  };

  setMessagesMap((prev) => ({
    ...prev,
    [unit_code]: [...(prev[unit_code] || []), message],
  }));
}


      if (event === "DELETE") {
        setMessagesMap((prev) => ({
          ...prev,
          [unit_code]: prev[unit_code].filter((m) => m.id !== msgData.id),
        }));
      }

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
    content: input,
    reply_to_id: replyingTo[unit_code]?.id || null, // ✅ attach reply reference
    
  }])
  .select();


    if (error) {
      console.error("Failed to send message:", error);
      return;
    }
if (data && data.length > 0) {
  // Realtime will handle inserting the message into state
  const audio = new Audio("/sounds/notification.mp3");
  audio.play().catch(err => console.warn("Sound play failed:", err));

    // ✅ Clear input and reply after sending
  setInputMap((prev) => ({ ...prev, [unit_code]: "" }));
  setReplyingTo((prev) => ({ ...prev, [unit_code]: null }));
}



    setInputMap((prev) => ({ ...prev, [unit_code]: "" }));
  };


  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 items-end z-50">
 <div className="relative">
  {/* Toggle Chat Icon */}
<Button
  ref={chatButtonRef}
  size="icon"
  className="rounded-full h-12 w-12 shadow-lg"
  onClick={() => setShowUnitSelector((prev) => !prev)}
>
  <MessageCircle className="h-6 w-6" />
</Button>


{/* Floating Unit Panel */}
{showUnitSelector && (
  <div
    ref={unitPanelRef}
    className="
      absolute bottom-14 right-0
      w-80 max-w-[90vw]
      h-72
      bg-card rounded-lg shadow-xl p-2 border
      origin-bottom-right
      transition-all duration-200 ease-out
      animate-in fade-in slide-in-from-bottom-2
      flex flex-col
    "
  >
    {/* Title */}
        {/* Panel Header with Title and Close */}
    <div className="flex justify-between items-center mb-1">
      <div className="text-xs font-medium text-muted-foreground">
        Select a unit
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setShowUnitSelector(false)}
        className="p-1"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>

    {/* Search */}
    <Input
      placeholder="Search units..."
      value={unitSearch}
      onChange={(e) => setUnitSearch(e.target.value)}
      className="mb-2 h-8 text-sm"
    />

    {/* Unit List */}
    <ul className="flex-1 overflow-y-auto divide-y scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">

      {[...userUnits]
        .sort((a, b) => {
          const aRecent = openChats.includes(a.unit_code);
          const bRecent = openChats.includes(b.unit_code);
          return aRecent === bRecent ? 0 : aRecent ? -1 : 1;
        })
        .filter((unit) =>
          unit.title.toLowerCase().includes(unitSearch.toLowerCase())
        )
        .map((unit) => (
          <li key={unit.unit_code}>
            <button
              type="button"
              onClick={() => {
                openChat(unit.unit_code);
                setShowUnitSelector(false);
                setUnitSearch("");
              }}
              className="
                w-full text-left px-3 py-2
                hover:bg-muted rounded-md
                transition
                text-sm
                flex justify-between items-center
              "
            >
              <span>{unit.title}</span>

              {openChats.includes(unit.unit_code) && (
                <span className="text-[10px] text-muted-foreground">
                  recent
                </span>
              )}
            </button>
          </li>
        ))}
    </ul>
  </div>
)}

 </div>
      {/* Open Chat Panels */}
     <div className="flex flex-col md:flex-row gap-2 max-w-screen-md overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">

        {openChats.map((unit_code) => {
          const messages = messagesMap[unit_code] || [];
          const input = inputMap[unit_code] || "";
          return (
         <div
  key={unit_code}
  className="bg-card shadow-xl rounded-xl flex flex-col overflow-hidden flex-shrink-0 absolute"
  style={{
    width: panelSizes[unit_code]?.width || 320,
    height: panelSizes[unit_code]?.height || 384,
    right: panelSizes[unit_code]?.right || 0,
    bottom: 0,
  }}
>
  {/* Top-left Resizer */}
  <div
    className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50"
    onMouseDown={(e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = panelSizes[unit_code]?.width || 320;
      const startHeight = panelSizes[unit_code]?.height || 384;
      const startRight = panelSizes[unit_code]?.right || 0;

      const onMouseMove = (e: MouseEvent) => {
        const deltaX = startX - e.clientX; // drag left → increase width
        const deltaY = startY - e.clientY; // drag up → increase height

        // Maximum width/height based on screen, leaving 20px margin
        const maxWidth = window.innerWidth - 20;
        const maxHeight = window.innerHeight - 20;

        const newWidth = Math.min(Math.max(200, startWidth + deltaX), maxWidth);
        const newHeight = Math.min(Math.max(200, startHeight + deltaY), maxHeight);
        const newRight = Math.min(Math.max(startRight - deltaX, 0), window.innerWidth - 20 - newWidth);

        setPanelSizes((prev) => ({
          ...prev,
          [unit_code]: { width: newWidth, height: newHeight, right: newRight },
        }));
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }}
  />

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
          className={`flex flex-col ${msg.user_id === currentUserId ? "items-end" : "items-start"} ${
            isSameSender ? "mt-1" : "mt-3"
          }`}
        >
          {/* Avatar + Name */}
          <div
            className={`flex items-center gap-2 mb-1 min-h-[32px] ${
              msg.user_id === currentUserId ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div className="flex-shrink-0">
              <Avatar className="h-8 w-8 overflow-visible">
                {msg.avatar_url ? (
                  <img
                    src={msg.avatar_url}
                    alt={msg.sender_name}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback className="h-8 w-8">
                    {msg.sender_name?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <span className="text-xs font-medium text-muted-foreground leading-none">
              {msg.sender_name}
            </span>
          </div>

          {/* Message Bubble */}
          <div
            className={`px-3 py-2 rounded-lg break-words max-w-[75%] relative group ${
              msg.deleted
                ? "bg-gray-300 dark:bg-gray-700 text-gray-600 italic cursor-default"
                : msg.user_id === currentUserId
                ? "bg-blue-600 text-white rounded-tr-none"
                : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none"
            }`}
            onClick={() => {
              if (msg.user_id !== currentUserId) return;
              setSelectedMessage(prev => (prev === msg.id ? null : msg.id));
            }}
            onContextMenu={(e) => {
              if (msg.deleted || msg.user_id !== currentUserId) return;
              e.preventDefault();
              setSelectedMessage(msg.id);
            }}
          >
            {/* Replied message snippet */}
            {msg.replyToId && (
              <div className="text-xs text-gray-500 dark:text-gray-300 mb-1 px-2 py-1 rounded-l border-l-2 border-blue-500 bg-gray-100 dark:bg-gray-800">
                {msg.replyToContent || "Loading..."}
              </div>
            )}

            {/* Main message content */}
            <p className="text-sm">{msg.content}</p>

            {/* Metadata */}
            <div
              className={`mt-1 flex justify-end items-center gap-1 text-[10px] ${
                msg.user_id === currentUserId ? "text-green-400" : "text-green-200"
              }`}
            >
              {msg.user_id === currentUserId && !msg.deleted && (
                <span className="flex gap-[1px]">
                  <Check className="h-3 w-3 text-green-400" />
                  <Check className="h-3 w-3 text-green-400" />
                </span>
              )}
              <span>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="ml-1">
                {new Date(msg.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Reply button */}
         {!msg.deleted && (
  <button
    className="text-xs text-blue-500 hover:underline mt-1 flex items-center justify-center p-1 rounded"
    onClick={() => setReplyingTo((prev) => ({ ...prev, [unit_code]: msg }))}
  >
    <CornerUpLeft className="h-4 w-4" />
  </button>
)}

          

            {/* Edit/Delete panel */}
            {!msg.deleted && selectedMessage === msg.id && (
              <div
                className="absolute left-0 right-0 mt-1 flex justify-start gap-2 bg-white dark:bg-gray-800 border rounded-xl shadow z-50 p-1"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Delete button */}
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-red-500 transition-colors duration-150 hover:bg-red-100 dark:hover:bg-red-800"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from("unit_messages")
                        .update({ content: "This message was deleted", deleted: true })
                        .eq("id", msg.id);

                      if (error) throw error;

                      setMessagesMap(prev => ({
                        ...prev,
                        [unit_code]: prev[unit_code].map(m =>
                          m.id === msg.id ? { ...m, content: "This message was deleted", deleted: true } : m
                        ),
                      }));
                      setSelectedMessage(null);
                    } catch (err) {
                      console.error("Failed to delete message:", err);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Edit button */}
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-blue-500 transition-colors duration-150 hover:bg-blue-100 dark:hover:bg-blue-800"
                  onClick={() => {
                    const newContent = prompt("Edit message:", msg.content);
                    if (newContent !== null) {
                      supabase
                        .from("unit_messages")
                        .update({ content: newContent })
                        .eq("id", msg.id)
                        .then(() => {
                          setMessagesMap(prev => ({
                            ...prev,
                            [unit_code]: prev[unit_code].map(m =>
                              m.id === msg.id ? { ...m, content: newContent } : m
                            ),
                          }));
                          setSelectedMessage(null);
                        });
                    }
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                {/* Close button */}
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-gray-500 transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setSelectedMessage(null)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </li>
      );
    })}
    <li ref={(el) => (messagesEndRefs.current[unit_code] = el)} />
  </ul>
</ScrollArea>


{/* Replying to snippet */}
{replyingTo[unit_code] && (
  <div className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-t text-xs text-gray-700 dark:text-gray-100 mb-1 flex justify-between items-center">
    <span>
      Replying to: {replyingTo[unit_code]?.content.slice(0, 50)}
    </span>
    <button
      className="ml-2 text-red-500"
      onClick={() => setReplyingTo((prev) => ({ ...prev, [unit_code]: null }))}
    >
      ✕
    </button>
  </div>
)}


              {/* Input */}
<div className="border-t p-2 flex gap-2 items-end relative">
  {/* Input Field */}
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

  {/* Emoji Picker Toggle Button */}
 <Button
  size="icon"
  variant="ghost"
  className="ml-1"
  onClick={() =>
    setActiveEmojiUnit((prev) =>
      prev === unit_code ? null : unit_code
    )
  }
>
  😊
</Button>


  {/* Floating Emoji Picker */}
{activeEmojiUnit && (
<div
  ref={emojiPickerRef}
  className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
  onClick={() => setActiveEmojiUnit(null)}
>
<div
      className="bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-fade w-96 h-[500px]"
      onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
    >
    
<EmojiPicker
  onEmojiClick={(emojiData: EmojiClickData) => {
    if (!activeEmojiUnit) return;
    setInputMap((prev) => ({
      ...prev,
      [activeEmojiUnit]: (prev[activeEmojiUnit] || "") + emojiData.emoji,
    }));
  }}
  theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
  width="100%"
  height="100%"
/>
    </div>
  </div>
)}


  {/* Send Button */}
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
