"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Check, MessageCircle, X, Edit2, Trash2, CornerUpLeft, Maximize2, Minimize2, Users, } from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
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

// Cache keys for localStorage
const CACHE_KEYS = {
  UNITS: 'floating_chat_units',
  MESSAGES_PREFIX: 'floating_chat_messages_',
  LAST_READ_PREFIX: 'floating_chat_last_read_',
  CACHE_TIMESTAMP: 'floating_chat_timestamp_'
};

// Cache expiry (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Helper to check if cache is valid
const isCacheValid = (key: string): boolean => {
  const timestamp = localStorage.getItem(`${CACHE_KEYS.CACHE_TIMESTAMP}${key}`);
  if (!timestamp) return false;
  return Date.now() - parseInt(timestamp) < CACHE_EXPIRY;
};

// Helper to get cached data
const getCachedData = <T,>(key: string): T | null => {
  if (!isCacheValid(key)) {
    localStorage.removeItem(key);
    localStorage.removeItem(`${CACHE_KEYS.CACHE_TIMESTAMP}${key}`);
    return null;
  }
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

// Helper to set cached data
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
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const unitPanelRef = useRef<HTMLDivElement | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const chatButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const session = useSession();
  const currentUserId = propUserId || session?.user?.id;
  const [activeEmojiUnit, setActiveEmojiUnit] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, Message | null>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Track loaded units to prevent reloading
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  // Track which units have had their messages loaded
  const messagesLoadedRef = useRef<Set<string>>(new Set());
  // Debounce timers
  const sendDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const vibrate = (duration: number = 50) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  };

  const handleUpdateMessage = async (id: number, newContent: string) => {
    const { error } = await supabase
      .from("unit_messages")
      .update({ content: newContent })
      .eq("id", id);

    if (!error) {
      setMessagesMap(prev => {
        const updated = { ...prev };
        if (activeUnit && updated[activeUnit]) {
          updated[activeUnit] = updated[activeUnit].map(m =>
            m.id === id ? { ...m, content: newContent } : m
          );
          // Update cache after modification
          setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit]);
        }
        return updated;
      });
      setSelectedMessage(null);
    }
  };

  // Load units with caching
  const loadUserUnits = useCallback(async () => {
    if (unitsLoaded) return; // Prevent duplicate loads

    // Try to load from cache first
    const cachedUnits = getCachedData<Unit[]>(CACHE_KEYS.UNITS);
    if (cachedUnits && cachedUnits.length > 0) {
      setUserUnits(cachedUnits);
      setUnitsLoaded(true);
      return;
    }

    // Fetch from Supabase if cache is invalid or empty
    const { data, error } = await supabase
      .from("quizzes")
      .select("id, unit_code, unit")
      .order("unit", { ascending: true });

    if (error) {
      console.error("Failed to load units:", error);
      return;
    }

    const units = (data || []).map((u: any) => ({
      id: u.id,
      unit_code: u.unit_code,
      title: u.unit || u.unit_code,
    }));

    setUserUnits(units);
    setCachedData(CACHE_KEYS.UNITS, units);
    setUnitsLoaded(true);
  }, [unitsLoaded]);

  // Load messages with caching
  const loadMessages = useCallback(async (unit_code: string) => {
    // Skip if already loaded in this session
    if (messagesLoadedRef.current.has(unit_code)) return;

    // Try to load from cache first
    const cachedMessages = getCachedData<Message[]>(`${CACHE_KEYS.MESSAGES_PREFIX}${unit_code}`);
    if (cachedMessages && cachedMessages.length > 0) {
      setMessagesMap((prev) => ({
        ...prev,
        [unit_code]: cachedMessages,
      }));
      messagesLoadedRef.current.add(unit_code);

      // Set last read from cache if exists
      const cachedLastRead = getCachedData<number>(`${CACHE_KEYS.LAST_READ_PREFIX}${unit_code}`);
      if (cachedLastRead) {
        setLastReadMap(prev => ({ ...prev, [unit_code]: cachedLastRead }));
      }
      return;
    }

    // Fetch from Supabase if cache is invalid
    const { data, error } = await supabase
      .from("unit_messages")
      .select(`*, profiles!fk_unit_messages_user(name, avatar_url)`)
      .eq("unit_code", unit_code)
      .order("created_at", { ascending: true });

    if (!data) return;

    const mappedMessages: Message[] = data.map((m: any) => ({
      id: m.id,
      unit_code: m.unit_code,
      user_id: m.user_id,
      content: m.content,
      created_at: m.created_at,
      sender_name: m.profiles?.name || "Unknown",
      avatar_url: m.profiles?.avatar_url || null,
      replyToId: m.reply_to_id || null,
      deleted: m.deleted || false,
    }));

    mappedMessages.forEach(msg => {
      if (msg.replyToId) {
        const repliedMsg = mappedMessages.find(m => m.id === msg.replyToId);
        if (repliedMsg) msg.replyToContent = repliedMsg.content;
      }
    });

    setMessagesMap((prev) => ({
      ...prev,
      [unit_code]: mappedMessages,
    }));

    // Cache the messages
    setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${unit_code}`, mappedMessages);
    messagesLoadedRef.current.add(unit_code);
  }, []);

  const openChat = useCallback((unit_code: string) => {
    if (!openChats.includes(unit_code)) {
      setOpenChats((prev) => [...prev, unit_code]);
      // Load messages when opening chat (cached)
      loadMessages(unit_code);
    }

    const messages = messagesMap[unit_code] || [];
    if (messages.length > 0) {
      const lastMessageId = messages[messages.length - 1].id;
      setLastReadMap((prev) => ({
        ...prev,
        [unit_code]: lastMessageId,
      }));
      // Cache last read
      setCachedData(`${CACHE_KEYS.LAST_READ_PREFIX}${unit_code}`, lastMessageId);
    }
  }, [openChats, messagesMap, loadMessages]);

  // Load open chats from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("openChats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setOpenChats(parsed);
      // Load messages for saved chats
      parsed.forEach((unit_code: string) => {
        loadMessages(unit_code);
      });
    }
  }, [loadMessages]);

  useEffect(() => {
    localStorage.setItem("openChats", JSON.stringify(openChats));
  }, [openChats]);

  useEffect(() => {
    loadUserUnits();
  }, [loadUserUnits]);

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
    openChats.forEach((unit_code) => {
      if (messagesEndRefs.current[unit_code]) {
        messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
      }
    });
  }, [messagesMap, openChats]);

  // Optimized subscription - only for open chats, with debouncing
  useEffect(() => {
    // 1. KILL SWITCH: If not in a chat, or tab is hidden, do nothing.
    if (activeScreen !== "chat" || !activeUnit) return;

    const channel = supabase
      .channel(`active-messages-${activeUnit}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "unit_messages",
          filter: `unit_code=eq.${activeUnit}`,
        },
        async (payload) => {
          const msgData = payload.new as any;

          // Skip if we already have this message
          if ((messagesMap[activeUnit] || []).some(m => m.id === msgData.id)) return;

          // Fetch profile (Only one call)
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", msgData.user_id)
            .maybeSingle();

          let replyToContent: string | undefined = undefined;
          if (msgData.reply_to_id) {
            const existingReply = (messagesMap[activeUnit] || []).find(m => m.id === msgData.reply_to_id);
            replyToContent = existingReply ? existingReply.content : "Referenced Data";
          }

          const newMessage: Message = {
            id: msgData.id,
            unit_code: msgData.unit_code,
            user_id: msgData.user_id,
            content: msgData.content,
            created_at: msgData.created_at,
            sender_name: profile?.name || "Unknown",
            avatar_url: profile?.avatar_url || null,
            replyToId: msgData.reply_to_id || null,
            replyToContent,
          };

          setMessagesMap((prev) => {
            const updated = {
              ...prev,
              [activeUnit]: [...(prev[activeUnit] || []), newMessage],
            };
            setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit]);
            return updated;
          });

          playSound("notification", false);
        }
      )
      .subscribe();

    // 2. DISCONNECT ON TAB HIDE: Stops heartbeats when user isn't looking
    const handleVisibility = () => {
      if (document.hidden) {
        supabase.removeChannel(channel);
      } else {
        // Re-trigger the effect by causing a state update or letting React handle it
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeUnit, activeScreen]); // Only runs when you switch unit or screen

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the tab - disconnect all Realtime
        supabase.removeAllChannels();
      } else {
        // User came back - the 'activeUnit' useEffect above will auto-reconnect
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Send message with debouncing
  const handleSend = async (unit_code: string) => {
    if (!currentUserId) return;

    const input = inputMap[unit_code]?.trim();
    if (!input) return;

    const selectedUnit = userUnits.find((u) => u.unit_code === unit_code);
    if (!selectedUnit) {
      console.error("Critical Error: Unit context not found for code:", unit_code);
      return;
    }

    // Debounce to prevent rapid-fire sends
    if (sendDebounceRef.current[unit_code]) {
      clearTimeout(sendDebounceRef.current[unit_code]);
    }

    sendDebounceRef.current[unit_code] = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("unit_messages")
          .insert([{
            unit_id: selectedUnit.id,
            unit_code: selectedUnit.unit_code,
            user_id: currentUserId,
            content: input,
            reply_to_id: replyingTo[unit_code]?.id || null,
          }])
          .select();

        if (error) {
          alert(`Clinical Database Error: ${error.message}`);
          console.error("Insert error:", error);
          return;
        }

        if (data && data.length > 0) {
          vibrate(40);
          setInputMap((prev) => ({ ...prev, [unit_code]: "" }));
          setReplyingTo((prev) => ({ ...prev, [unit_code]: null }));
          messagesEndRefs.current[unit_code]?.scrollIntoView({ behavior: "smooth" });
        }
      } catch (err) {
        console.error("Unexpected error during transmission:", err);
      }
      delete sendDebounceRef.current[unit_code];
    }, 300);
  };

  // If chat is closed, don't render
  if (!isOpen) return null;

  // Handle close button
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const chatContent = (
    <div className={cn(
      "flex flex-col bg-background w-full h-full overflow-hidden border-0 shadow-xl",
      isMobile ? "rounded-none" : "rounded-2xl",
      isExpanded && !isMobile ? "w-[800px] h-[90vh]" : "w-[380px] h-[calc(100vh-20px)] max-h-[700px]"
    )}>
      {/* ================= CHAT LIST SCREEN ================= */}
      {activeScreen === "list" && (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-background border-0">
          {/* HEADER with close button */}
          <div className="shrink-0 px-5 py-5 border-0 dark:bg-background bg-white/80 dark:bg-background backdrop-blur-2xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-teal-500/50 via-teal-500 to-teal-500/50" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">
                  Roster Registry
                </h2>
                <span className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-[9px] font-mono font-bold text-teal-600 animate-in fade-in zoom-in-95">
                  {userUnits.length} UNITS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                  Network: Operational
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-muted/30 flex items-center justify-center text-slate-500 hover:text-teal-500 hover:border-teal-500/50 hover:shadow-[0_0_15px_rgba(20,184,166,0.1)] transition-all active:scale-90"
              >
                {isExpanded ? <Minimize2 size={16} strokeWidth={2.5} /> : <Maximize2 size={16} strokeWidth={2.5} />}
              </button>
              <button
                onClick={handleClose}
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-muted/30 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all active:scale-90"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* CHAT LIST */}
          <ScrollArea className="flex-1 overflow-y-auto px-4">
            <div className="flex flex-col p-1.5 space-y-0.5">
              {userUnits.length === 0 ? (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                  <Users size={32} className="mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No Rosters</p>
                </div>
              ) : (
                userUnits.map((unit, index) => {
                  const messages = messagesMap[unit.unit_code] || [];
                  const lastMessage = messages[messages.length - 1];
                  const unread = messages.length - (lastReadMap[unit.unit_code]
                    ? messages.findIndex((m) => m.id === lastReadMap[unit.unit_code]) + 1
                    : 0);

                  const localAvatars = [
                    '/background05.jpg',
                    '/indexbackground3.jpg',
                    '/background03.jpg',
                    '/background02.jpg',
                    '/background06.jpg',
                    '/terms (1).png',
                    '/indexbackground2.jpg',
                  ];

                  const avatarUrl = localAvatars[index % localAvatars.length];
                  return (
                    <div
                      key={unit.unit_code}
                      onClick={() => {
                        setActiveUnit(unit.unit_code);
                        setActiveScreen("chat");
                        openChat(unit.unit_code);
                      }}
                      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-all active:scale-[0.98] border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                    >
                      <div className="relative shrink-0">
                        <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-sm transition-transform group-hover:scale-105">
                          <img
                            src={avatarUrl}
                            alt="group"
                            className="h-full w-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all"
                          />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 bg-emerald-500 shadow-sm" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3
                            title={unit.title}
                            className="font-bold text-[13px] text-slate-800 dark:text-slate-100 truncate pr-2 tracking-tight group-hover:text-teal-600 transition-colors"
                          >
                            {unit.title}
                          </h3>
                          {lastMessage && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">
                              {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] leading-none">
                            {lastMessage ? (
                              <>
                                <span className="font-bold text-teal-600 text-[10px] uppercase mr-1">{lastMessage.sender_name?.split(' ')[0]}:</span>
                                {lastMessage.content}
                              </>
                            ) : "No clinical logs..."}
                          </p>

                          {unread > 0 && (
                            <div className="bg-teal-600 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-sm shadow-teal-600/20">
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

          <div className="shrink-0 py-3 border-t bg-slate-50/50 dark:bg-slate-900/50 opacity-40 select-none pointer-events-none text-center">
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-500">Medrae • Clinical Roster System</p>
          </div>
        </div>
      )}

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 relative">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.15] dark:opacity-[0.1] transition-opacity duration-1000"
            style={{
              backgroundImage: "url('/background05.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(1px)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/90 dark:from-slate-950/80 dark:via-transparent dark:to-slate-950/90" />
          <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]" />
          <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='0.5'/%3E%3C/g%3E%3C/svg%3E")` }}
          />
        </div>

        {activeScreen !== "chat" || !activeUnit ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 z-10">
            <div className="p-6 bg-slate-50 dark:bg-muted/30 rounded-full animate-pulse">
              <MessageCircle className="w-12 h-12 text-teal-500 opacity-40" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Select Unit Roster</p>
          </div>
        ) : (
          (() => {
            const activeUnitData = userUnits.find((u) => u.unit_code === activeUnit);
            const messages = messagesMap[activeUnit] || [];
            const input = inputMap[activeUnit] || "";

            return (
              <div className="flex flex-col h-full w-full overflow-hidden relative z-0 isolate">
                {/* HEADER */}
                <div className="flex-none border-b bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl px-4 py-3 flex items-center justify-between z-20">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActiveScreen("list"); setActiveUnit(null); }}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-teal-500 hover:text-white transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        {activeUnitData?.title || activeUnit}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[9px] text-teal-600 font-bold uppercase tracking-widest">Clinical Discussion Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-teal-500 hover:text-white transition-all"
                    >
                      {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* MESSAGES AREA */}
                <ScrollArea className="flex-1 overflow-y-auto px-4">
                  {messages.length === 0 ? (
                    <div className="h-full min-h-[450px] flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-700">
                      <div className="relative mb-8">
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl relative z-10">
                          <img
                            src="/background05.jpg"
                            alt="Unit Roster"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-[-10px] bg-teal-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute -bottom-2 right-0 bg-teal-600 text-white p-2 rounded-xl shadow-lg z-20">
                          <Users size={16} />
                        </div>
                      </div>

                      <div className="space-y-2 px-6">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                          {activeUnitData?.title || activeUnit}
                        </h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800">
                          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                          <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                            Official Unit Log
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 max-w-[240px] leading-relaxed font-medium">
                          No clinical observations have been logged for this roster. Be the first to start the discussion below.
                        </p>
                      </div>

                      <button
                        onClick={() => { setActiveScreen("list"); setActiveUnit(null); }}
                        className="mt-10 px-8 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-600 hover:text-white transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-xl flex items-center gap-3"
                      >
                        <CornerUpLeft size={14} />
                        Try Another Unit
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessage(prev => (prev === msg.id ? null : msg.id));
                            }}
                            className={cn(
                              "flex items-end gap-2 transition-all animate-in fade-in slide-in-from-bottom-2",
                              isMe ? "flex-row-reverse" : "flex-row",
                              !isSameSender ? "mt-6" : "mt-1"
                            )}
                          >
                            <Avatar className="h-10 w-10 shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
                              {msg.avatar_url ? (
                                <img
                                  src={msg.avatar_url}
                                  alt={msg.sender_name || "avatar"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <AvatarFallback className="bg-teal-100 text-teal-700 font-black">
                                  {msg.sender_name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                              {!isSameSender && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">
                                  {isMe ? "Medical Personnel (You)" : msg.sender_name}
                                </span>
                              )}

                              <div className="relative group">
                                <div className={cn(
                                  "px-4 py-2.5 shadow-sm rounded-2xl text-[13px] leading-relaxed transition-all",
                                  isMe
                                    ? "bg-teal-600 text-white rounded-tr-none shadow-teal-500/20"
                                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800"
                                )}>
                                  {msg.replyToId && (
                                    <div className={cn(
                                      "mb-2 p-2 rounded-lg text-[10px] border-l-4 font-medium truncate bg-black/5 dark:bg-white/5",
                                      isMe ? "border-teal-300 text-teal-50" : "border-teal-500 text-slate-500"
                                    )}>
                                      <span className="font-black uppercase text-[8px] block opacity-70 mb-0.5">
                                        {msg.sender_name} replied to {replyingToName}
                                      </span>
                                      "{msg.replyToContent || "Referenced Clinical Data"}"
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                  <div className="mt-1 flex items-center justify-end gap-1 opacity-40 text-[8px] font-bold uppercase tracking-tighter">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && <Check className="h-2.5 w-2.5" />}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setReplyingTo((p) => ({ ...p, [activeUnit]: msg }))}
                                  className={cn(
                                    "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-teal-500",
                                    isMe ? "-left-8" : "-right-8"
                                  )}
                                >
                                  <CornerUpLeft size={14} />
                                </button>
                                {!msg.deleted && selectedMessage === msg.id && (
                                  <div
                                    className="absolute -top-10 right-0 z-50 flex items-center gap-1 p-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      title="Edit message"
                                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all duration-200 group"
                                      onClick={() => {
                                        const newContent = prompt("Edit message:", msg.content);
                                        if (newContent && newContent !== msg.content) {
                                          handleUpdateMessage(msg.id, newContent);
                                        }
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>

                                    <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                                    <button
                                      title="Delete message"
                                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-all duration-200"
                                      onClick={async () => {
                                        if (window.confirm("Delete this message?")) {
                                          try {
                                            const { error } = await supabase
                                              .from("unit_messages")
                                              .update({ content: "This message was deleted", deleted: true })
                                              .eq("id", msg.id);

                                            if (error) throw error;

                                            setMessagesMap(prev => {
                                              const updated = { ...prev };
                                              if (activeUnit && updated[activeUnit]) {
                                                updated[activeUnit] = updated[activeUnit].map(m =>
                                                  m.id === msg.id ? { ...m, content: "This message was deleted", deleted: true } : m
                                                );
                                                setCachedData(`${CACHE_KEYS.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit]);
                                              }
                                              return updated;
                                            });
                                            setSelectedMessage(null);
                                          } catch (err) {
                                            console.error("Delete failed:", err);
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>

                                    <button
                                      title="Close"
                                      className="ml-1 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors"
                                      onClick={() => setSelectedMessage(null)}
                                    >
                                      <X className="h-4 w-4" />
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
                <div className="flex-none relative z-20">
                  {replyingTo[activeUnit] && (
                    <div className="px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-teal-500/30 flex justify-between items-center animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-1 bg-teal-500 rounded-full" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Tagging {replyingTo[activeUnit]?.sender_name}</span>
                          <p className="text-xs text-slate-500 truncate italic">"{replyingTo[activeUnit]?.content}"</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyingTo((p) => ({ ...p, [activeUnit]: null }))}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  )}

                  <div className="p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        value={input}
                        placeholder="Type clinical observation..."
                        className="rounded-2xl h-12 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 px-5 text-sm focus-visible:ring-teal-500 transition-all pr-12"
                        onChange={(e) => setInputMap((p) => ({ ...p, [activeUnit]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSend(activeUnit)}
                      />
                      <button
                        type="button"
                        onClick={() => setActiveEmojiUnit(prev => prev === activeUnit ? null : activeUnit)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
                      >
                        😊
                      </button>
                    </div>

                    <Button
                      onClick={() => handleSend(activeUnit)}
                      disabled={!input.trim()}
                      className="h-12 w-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 transition-all active:scale-90"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {activeEmojiUnit === activeUnit && (
                  <div className="absolute bottom-20 right-4 z-[30] animate-in zoom-in-95 origin-bottom-right shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
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

  // Smart positioning - full screen on mobile, floating on desktop
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] bg-background">
        {chatContent}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-h-[90vh]">
      {chatContent}
    </div>
  );
}