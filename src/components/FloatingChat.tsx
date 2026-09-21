"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Check, MessageCircle, X, Edit2, Trash2, CornerUpLeft, Maximize2, Minimize2, Users } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { useSession } from "@supabase/auth-helpers-react";
import { playSound } from "@/lib/soundManager";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  unit_code: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  avatar_url?: string | null;
  replyToId?: number | null;
  deleted?: boolean;
  replyToContent?: string;
}

interface Unit {
  id: string;
  unit_code: string;
  title: string;
}

const CACHE_KEYS = {
  UNITS: 'floating_chat_units',
  MESSAGES_PREFIX: 'floating_chat_messages_',
  LAST_READ_PREFIX: 'floating_chat_last_read_',
  CACHE_TIMESTAMP: 'floating_chat_timestamp_'
};

const CACHE_EXPIRY = 5 * 60 * 1000;

const isCacheValid = (key: string): boolean => {
  const timestamp = localStorage.getItem(`${CACHE_KEYS.CACHE_TIMESTAMP}${key}`);
  if (!timestamp) return false;
  return Date.now() - parseInt(timestamp) < CACHE_EXPIRY;
};

const getCachedData = <T,>(key: string): T | null => {
  if (!isCacheValid(key)) {
    localStorage.removeItem(key);
    localStorage.removeItem(`${CACHE_KEYS.CACHE_TIMESTAMP}${key}`);
    return null;
  }
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const setCachedData = <T,>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(`${CACHE_KEYS.CACHE_TIMESTAMP}${key}`, Date.now().toString());
};

interface FloatingChatProps {
  currentUserId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FloatingChat({ currentUserId: propUserId, isOpen = true, onClose }: FloatingChatProps) {
  const [userUnits, setUserUnits] = useState<Unit[]>([]);
  const [openChats, setOpenChats] = useState<string[]>([]);
  const [activeScreen, setActiveScreen] = useState<"list" | "chat">("list");
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const session = useSession();
  const currentUserId = propUserId || session?.user?.id;
  const [activeEmojiUnit, setActiveEmojiUnit] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, Message | null>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const messagesLoadedRef = useRef<Set<string>>(new Set());
  const sendDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const vibrate = (duration: number = 50) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(duration);
  };

  const handleUpdateMessage = async (id: number, newContent: string) => {
    const { error } = await supabase.from("unit_messages").update({ content: newContent }).eq("id", id);
    if (!error) {
      setMessagesMap(prev => {
        const updated = { ...prev };
        if (activeUnit && updated[activeUnit]) {
          updated[activeUnit] = updated[activeUnit].map(m => m.id === id ? { ...m, content: newContent } : m);
          setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit]);
        }
        return updated;
      });
      setSelectedMessage(null);
    }
  };

  const loadUserUnits = useCallback(async () => {
    if (unitsLoaded) return;
    const cachedUnits = getCachedData<Unit[]>(CACHE_KEYS.UNITS);
    if (cachedUnits && cachedUnits.length > 0) {
      setUserUnits(cachedUnits);
      setUnitsLoaded(true);
      return;
    }
    const { data, error } = await supabase.from("quizzes").select("id, unit_code, unit").order("unit", { ascending: true });
    if (error) { console.error("Failed to load units:", error); return; }
    const units = (data || []).map((u: any) => ({ id: u.id, unit_code: u.unit_code, title: u.unit || u.unit_code }));
    setUserUnits(units);
    setCachedData(CACHE_KEYS.UNITS, units);
    setUnitsLoaded(true);
  }, [unitsLoaded]);

  const loadMessages = useCallback(async (unit_code: string) => {
    if (messagesLoadedRef.current.has(unit_code)) return;
    const cachedMessages = getCachedData<Message[]>(`${CACHE_KEYS.MESSAGES_PREFIX}${unit_code}`);
    if (cachedMessages && cachedMessages.length > 0) {
      setMessagesMap(prev => ({ ...prev, [unit_code]: cachedMessages }));
      messagesLoadedRef.current.add(unit_code);
      const cachedLastRead = getCachedData<number>(`${CACHE_KEYS.LAST_READ_PREFIX}${unit_code}`);
      if (cachedLastRead) setLastReadMap(prev => ({ ...prev, [unit_code]: cachedLastRead }));
      return;
    }
    const { data } = await supabase.from("unit_messages").select(`*, profiles!fk_unit_messages_user(name, avatar_url)`).eq("unit_code", unit_code).order("created_at", { ascending: true });
    if (!data) return;
    const mappedMessages: Message[] = data.map((m: any) => ({
      id: m.id, unit_code: m.unit_code, user_id: m.user_id, content: m.content, created_at: m.created_at,
      sender_name: m.profiles?.name || "Unknown", avatar_url: m.profiles?.avatar_url || null,
      replyToId: m.reply_to_id || null, deleted: m.deleted || false,
    }));
    mappedMessages.forEach(msg => {
      if (msg.replyToId) {
        const repliedMsg = mappedMessages.find(m => m.id === msg.replyToId);
        if (repliedMsg) msg.replyToContent = repliedMsg.content;
      }
    });
    setMessagesMap(prev => ({ ...prev, [unit_code]: mappedMessages }));
    setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${unit_code}`, mappedMessages);
    messagesLoadedRef.current.add(unit_code);
  }, []);

  const openChat = useCallback((unit_code: string) => {
    if (!openChats.includes(unit_code)) {
      setOpenChats(prev => [...prev, unit_code]);
      loadMessages(unit_code);
    }
    const messages = messagesMap[unit_code] || [];
    if (messages.length > 0) {
      const lastMessageId = messages[messages.length - 1].id;
      setLastReadMap(prev => ({ ...prev, [unit_code]: lastMessageId }));
      setCachedData(`${CACHE_KEYS.LAST_READ_PREFIX}${unit_code}`, lastMessageId);
    }
  }, [openChats, messagesMap, loadMessages]);

  useEffect(() => {
    const saved = localStorage.getItem("openChats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setOpenChats(parsed);
      parsed.forEach((unit_code: string) => loadMessages(unit_code));
    }
  }, [loadMessages]);

  useEffect(() => {
    localStorage.setItem("openChats", JSON.stringify(openChats));
  }, [openChats]);

  useEffect(() => { loadUserUnits(); }, [loadUserUnits]);

  useEffect(() => {
    if (!activeEmojiUnit) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setActiveEmojiUnit(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeEmojiUnit]);

  useEffect(() => {
    openChats.forEach((unit_code) => {
      if (messagesEndRefs.current[unit_code]) messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messagesMap, openChats]);

  useEffect(() => {
    if (activeScreen !== "chat" || !activeUnit) return;
    const channel = supabase
      .channel(`active-messages-${activeUnit}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "unit_messages", filter: `unit_code=eq.${activeUnit}` }, async (payload) => {
        const msgData = payload.new as any;
        if ((messagesMap[activeUnit] || []).some(m => m.id === msgData.id)) return;
        const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", msgData.user_id).maybeSingle();
        let replyToContent: string | undefined = undefined;
        if (msgData.reply_to_id) {
          const existingReply = (messagesMap[activeUnit] || []).find(m => m.id === msgData.reply_to_id);
          replyToContent = existingReply ? existingReply.content : "Referenced Data";
        }
        const newMessage: Message = {
          id: msgData.id, unit_code: msgData.unit_code, user_id: msgData.user_id,
          content: msgData.content, created_at: msgData.created_at,
          sender_name: profile?.name || "Unknown", avatar_url: profile?.avatar_url || null,
          replyToId: msgData.reply_to_id || null, replyToContent,
        };
        setMessagesMap((prev) => {
          const updated = { ...prev, [activeUnit]: [...(prev[activeUnit] || []), newMessage] };
          setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit]);
          return updated;
        });
        playSound("notification", false);
      })
      .subscribe();

    const handleVisibility = () => { if (document.hidden) supabase.removeChannel(channel); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeUnit, activeScreen]);

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden) supabase.removeAllChannels(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleSend = async (unit_code: string) => {
    if (!currentUserId) return;
    const input = inputMap[unit_code]?.trim();
    if (!input) return;
    const selectedUnit = userUnits.find((u) => u.unit_code === unit_code);
    if (!selectedUnit) return;
    if (sendDebounceRef.current[unit_code]) clearTimeout(sendDebounceRef.current[unit_code]);
    sendDebounceRef.current[unit_code] = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from("unit_messages").insert([{
          unit_id: selectedUnit.id, unit_code: selectedUnit.unit_code, user_id: currentUserId,
          content: input, reply_to_id: replyingTo[unit_code]?.id || null,
        }]).select();
        if (error) { alert(`Clinical Database Error: ${error.message}`); return; }
        if (data && data.length > 0) {
          vibrate(40);
          setInputMap(prev => ({ ...prev, [unit_code]: "" }));
          setReplyingTo(prev => ({ ...prev, [unit_code]: null }));
          messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
        }
      } catch (err) { console.error("Unexpected error during transmission:", err); }
      delete sendDebounceRef.current[unit_code];
    }, 300);
  };

  if (!isOpen) return null;
  const handleClose = () => { if (onClose) onClose(); };

  const chatContent = (
    <div className={cn(
      "flex flex-col bg-white dark:bg-[#161b22] w-full h-full overflow-hidden",
      isMobile ? "rounded-none" : "rounded-2xl",
      isExpanded && !isMobile ? "w-[800px] h-[90vh]" : "w-[380px] h-[calc(100vh-20px)] max-h-[700px]"
    )}>

      {/* ================= CHAT LIST SCREEN ================= */}
      {activeScreen === "list" && (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#161b22]">
          {/* HEADER */}
          <div className="shrink-0 px-5 py-5 flex items-center justify-between bg-white dark:bg-[#161b22]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Roster Registry
                </h2>
                <span className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#21262d] text-[9px] font-medium text-gray-600 dark:text-gray-400">
                  {userUnits.length} units
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  Network operational
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all active:scale-90"
              >
                {isExpanded ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
              </button>
              <button
                onClick={handleClose}
                className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all active:scale-90"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* CHAT LIST */}
          <ScrollArea className="flex-1 overflow-y-auto px-4">
            <div className="flex flex-col p-1.5 space-y-0.5">
              {userUnits.length === 0 ? (
                <div className="py-20 text-center opacity-40 flex flex-col items-center">
                  <Users size={32} className="mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500">No rosters</p>
                </div>
              ) : (
                userUnits.map((unit, index) => {
                  const messages = messagesMap[unit.unit_code] || [];
                  const lastMessage = messages[messages.length - 1];
                  const unread = messages.length - (lastReadMap[unit.unit_code]
                    ? messages.findIndex((m) => m.id === lastReadMap[unit.unit_code]) + 1
                    : 0);
                  const localAvatars = ['/background05.jpg', '/indexbackground3.jpg', '/background03.jpg', '/background02.jpg', '/background06.jpg', '/terms (1).png', '/indexbackground2.jpg'];
                  const avatarUrl = localAvatars[index % localAvatars.length];
                  return (
                    <div
                      key={unit.unit_code}
                      onClick={() => { setActiveUnit(unit.unit_code); setActiveScreen("chat"); openChat(unit.unit_code); }}
                      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#21262d] cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d]">
                          <img src={avatarUrl} alt="group" className="h-full w-full object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-[#161b22] bg-emerald-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 title={unit.title} className="font-semibold text-[13px] text-gray-800 dark:text-gray-200 truncate pr-2">
                            {unit.title}
                          </h3>
                          {lastMessage && (
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
                              {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px] leading-none">
                            {lastMessage ? (
                              <>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1">{lastMessage.sender_name?.split(' ')[0]}:</span>
                                {lastMessage.content}
                              </>
                            ) : "No messages yet"}
                          </p>
                          {unread > 0 && (
                            <div className="bg-gray-800 dark:bg-[#21262d] text-white text-[10px] font-semibold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center">
                              {unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 py-3 text-center bg-gray-50 dark:bg-[#21262d]/50">
            <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500">Medrae · Clinical roster</p>
          </div>
        </div>
      )}

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0d1117] relative">
        {activeScreen !== "chat" || !activeUnit ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="p-6 bg-gray-50 dark:bg-[#21262d] rounded-full">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-500">Select a unit</p>
          </div>
        ) : (
          (() => {
            const activeUnitData = userUnits.find((u) => u.unit_code === activeUnit);
            const messages = messagesMap[activeUnit] || [];
            const input = inputMap[activeUnit] || "";

            return (
              <div className="flex flex-col h-full w-full overflow-hidden relative">
                {/* HEADER */}
                <div className="flex-none bg-white dark:bg-[#161b22] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActiveScreen("list"); setActiveUnit(null); }}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {activeUnitData?.title || activeUnit}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all"
                    >
                      {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* MESSAGES AREA */}
                <ScrollArea className="flex-1 overflow-y-auto px-4 bg-gray-50 dark:bg-[#0d1117]">
                  {messages.length === 0 ? (
                    <div className="h-full min-h-[450px] flex flex-col items-center justify-center py-10 text-center">
                      <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d] mb-6">
                        <img src="/background05.jpg" alt="Unit Roster" className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-2 px-6">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                          {activeUnitData?.title || activeUnit}
                        </h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#21262d]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">New discussion</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 max-w-[240px] leading-relaxed">
                          No messages yet. Be the first to start the discussion.
                        </p>
                      </div>
                      <button
                        onClick={() => { setActiveScreen("list"); setActiveUnit(null); }}
                        className="mt-8 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all active:scale-95 flex items-center gap-2"
                      >
                        <CornerUpLeft size={14} />
                        Try another unit
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col py-6 space-y-4">
                      {messages.map((msg, idx) => {
                        const isMe = msg.user_id === currentUserId;
                        const prevMsg = messages[idx - 1];
                        const isSameSender = prevMsg && prevMsg.user_id === msg.user_id;
                        const originalMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
                        const replyingToName = originalMsg?.user_id === currentUserId ? "You" : originalMsg?.sender_name;

                        return (
                          <div
                            key={msg.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedMessage(prev => (prev === msg.id ? null : msg.id)); }}
                            className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row", !isSameSender ? "mt-6" : "mt-1")}
                          >
                            <Avatar className="h-9 w-9 shrink-0">
                              {msg.avatar_url ? (
                                <img src={msg.avatar_url} alt={msg.sender_name || "avatar"} className="h-full w-full object-cover" />
                              ) : (
                                <AvatarFallback className="bg-gray-200 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 text-xs font-semibold">
                                  {msg.sender_name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                              {!isSameSender && (
                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 px-1">
                                  {isMe ? "You" : msg.sender_name}
                                </span>
                              )}

                              <div className="relative group">
                                <div className={cn(
                                  "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                                  isMe
                                    ? "bg-gray-800 dark:bg-[#21262d] text-white dark:text-gray-200 rounded-tr-none"
                                    : "bg-white dark:bg-[#161b22] text-gray-800 dark:text-gray-200 rounded-tl-none"
                                )}>
                                  {msg.replyToId && (
                                    <div className={cn(
                                      "mb-2 p-2 rounded-lg text-[10px] font-medium truncate",
                                      isMe ? "bg-white/10 text-white/80" : "bg-gray-50 dark:bg-[#21262d] text-gray-500 dark:text-gray-400"
                                    )}>
                                      <span className="block opacity-70 mb-0.5">
                                        {msg.sender_name} replied to {replyingToName}
                                      </span>
                                      "{msg.replyToContent || "Referenced message"}"
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                  <div className="mt-1 flex items-center justify-end gap-1 opacity-50 text-[9px] font-medium">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && <Check className="h-2.5 w-2.5" />}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setReplyingTo((p) => ({ ...p, [activeUnit]: msg }))}
                                  className={cn(
                                    "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
                                    isMe ? "-left-8" : "-right-8"
                                  )}
                                >
                                  <CornerUpLeft size={14} />
                                </button>

                                {!msg.deleted && selectedMessage === msg.id && (
                                  <div
                                    className="absolute -top-10 right-0 z-50 flex items-center gap-1 p-1 bg-white dark:bg-[#21262d] rounded-xl"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      title="Edit"
                                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] rounded-lg transition-colors"
                                      onClick={() => {
                                        const newContent = prompt("Edit message:", msg.content);
                                        if (newContent && newContent !== msg.content) handleUpdateMessage(msg.id, newContent);
                                      }}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      title="Delete"
                                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] rounded-lg transition-colors"
                                      onClick={async () => {
                                        if (window.confirm("Delete this message?")) {
                                          try {
                                            const { error } = await supabase.from("unit_messages").update({ content: "This message was deleted", deleted: true }).eq("id", msg.id);
                                            if (error) throw error;
                                            setMessagesMap(prev => {
                                              const updated = { ...prev };
                                              if (activeUnit && updated[activeUnit]) {
                                                updated[activeUnit] = updated[activeUnit].map(m => m.id === msg.id ? { ...m, content: "This message was deleted", deleted: true } : m);
                                                setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit]);
                                              }
                                              return updated;
                                            });
                                            setSelectedMessage(null);
                                          } catch (err) { console.error("Delete failed:", err); }
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      title="Close"
                                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                                      onClick={() => setSelectedMessage(null)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={(el) => (messagesEndRefs.current[activeUnit] = el)} className="h-2" />
                    </div>
                  )}
                </ScrollArea>

                {/* BOTTOM BAR */}
                <div className="flex-none relative bg-white dark:bg-[#161b22]">
                  {replyingTo[activeUnit] && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-[#21262d] flex justify-between items-center">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-0.5 bg-gray-400 dark:bg-gray-600 rounded-full" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Replying to {replyingTo[activeUnit]?.sender_name}</span>
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate italic">"{replyingTo[activeUnit]?.content}"</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyingTo((p) => ({ ...p, [activeUnit]: null }))}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  )}

                  <div className="p-4 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        value={input}
                        placeholder="Type a message…"
                        className="rounded-2xl h-12 bg-gray-50 dark:bg-[#21262d] border-0 px-5 text-sm focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-[#30363d] pr-12 transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        onChange={(e) => setInputMap((p) => ({ ...p, [activeUnit]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSend(activeUnit)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveEmojiUnit(prev => prev === activeUnit ? null : activeUnit)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        😊
                      </button>
                    </div>

                    <Button
                      onClick={() => handleSend(activeUnit)}
                      disabled={!input.trim()}
                      className="h-12 w-12 rounded-2xl bg-gray-800 hover:bg-gray-900 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white transition-all active:scale-90 border-0"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {activeEmojiUnit === activeUnit && (
                  <div ref={emojiPickerRef} className="absolute bottom-20 right-4 z-[30] rounded-2xl overflow-hidden">
                    <EmojiPicker
                      onEmojiClick={(d) => {
                        setInputMap((p) => ({ ...p, [activeUnit]: (p[activeUnit] || "") + d.emoji }));
                        setActiveEmojiUnit(null);
                      }}
                      theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
                      width={280}
                      height={350}
                    />
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0d1117]">{chatContent}</div>;
  }

  return <div className="fixed bottom-4 right-4 z-[100] max-h-[90vh]">{chatContent}</div>;
}