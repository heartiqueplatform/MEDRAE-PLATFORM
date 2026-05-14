"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"; // adjust path if needed

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Unit {
  id: number;
  name: string;
  description?: string;
}

interface Message {

  id: number;
  unit_id: number;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  avatar_url?: string;
  reply_to?: string | null; // ✅ add this line

}

export function Forum() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [joinedUnits, setJoinedUnits] = useState<number[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [memberCount, setMemberCount] = useState<number>(0);
  const [showRules, setShowRules] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [loadingUnits, setLoadingUnits] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  function TypingBubbles({ isDarkTheme }: { isDarkTheme: boolean }) {
    const bubbleColor = isDarkTheme ? "bg-gray-500" : "bg-gray-400";

    return (
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
        <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
        <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
      </div>
    );
  }

  // Load user & units & memberships
  useEffect(() => {
    const init = async () => {
      setLoadingUnits(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingUnits(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data: unitsData } = await supabase.from("forum_units").select("*");
      setUnits(unitsData || []);

      const { data: joinedData } = await supabase
        .from("group_memberships")
        .select("unit_id")
        .eq("user_id", user.id);

      setJoinedUnits(joinedData?.map((d) => d.unit_id) || []);
      setLoadingUnits(false);
    };
    init();
  }, []);


  // Realtime member count (from group_memberships)
  useEffect(() => {
    if (!selectedUnit) return;

    const fetchMembers = async () => {
      const { count, error } = await supabase
        .from("group_memberships")
        .select("*", { count: "exact", head: true })
        .eq("unit_id", selectedUnit.id);

      if (error) {
        console.error("Error fetching member count:", error);
        setMemberCount(0);
        return;
      }

      setMemberCount(count || 0);
    };

    // Initial load
    fetchMembers();

    // 👇 Subscribe to INSERT + DELETE in memberships
    const channel = supabase
      .channel(`unit-members-${selectedUnit.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_memberships",
          filter: `unit_id=eq.${selectedUnit.id}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUnit]);



  // Auto-scroll messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    const end = messagesEndRef.current;

    if (!container || !end) return; // ✅ prevents null crash

    const isAtBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

    if (isAtBottom) {
      end.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  // Load unit messages with reply content
  const loadUnitMessages = async (unit: Unit) => {
    if (!joinedUnits.includes(unit.id)) {
      setMessages([]);
      return;
    }

    // Fetch messages with sender profile
    const { data: msgs } = await supabase
      .from("group_messages")
      .select(`*, profiles(name, avatar_url)`)
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true });

    if (!msgs || msgs.length === 0) {
      setMessages([]);
      return;
    }

    // Collect all reply_to IDs to fetch their content
    const replyIds = msgs
      .filter((m: any) => m.reply_to)
      .map((m: any) => m.reply_to);

    let repliesMap: Record<number, string> = {};
    if (replyIds.length > 0) {
      const { data: replyMsgs } = await supabase
        .from("group_messages")
        .select("id, content")
        .in("id", replyIds);

      repliesMap = replyMsgs?.reduce((acc: any, r: any) => {
        acc[r.id] = r.content;
        return acc;
      }, {}) || {};
    }

    // Map messages including reply content
    setMessages(
      msgs.map((m: any) => ({
        id: m.id,
        unit_id: m.unit_id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        sender_name: m.profiles?.name || "Unknown",
        avatar_url: m.profiles?.avatar_url || null,
        reply_to: m.reply_to || null,
        reply_content: m.reply_to ? repliesMap[m.reply_to] || "Message deleted" : null,
      }))
    );
  };

  // Handle selecting a unit
  const handleSelectUnit = async (unit: Unit) => {
    setSelectedUnit(unit);
    setLoadingMessages(true);        // start loader
    // Load messages for this unit
    await loadUnitMessages(unit);
    setLoadingMessages(false);       // stop loader
  };

  // --- Optimistic Join/Leave ---
  const joinUnit = async (unitId: number) => {
    if (!currentUserId) return;

    // Check first
    const { data: existing, error } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("unit_id", unitId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Join error:", error);
      return;
    }

    if (!existing) {
      const { error: insertError } = await supabase
        .from("group_memberships")
        .insert([{ unit_id: unitId, user_id: currentUserId }]);

      if (insertError) {
        console.error("Insert membership failed:", insertError);
        return;
      }
    }


    // ✅ Update UI after success
    setJoinedUnits((prev) => [...prev, unitId]);

    const unit = units.find((u) => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
      await loadUnitMessages(unit);
    }
  };

  const leaveUnit = async (unitId: number) => {
    if (!currentUserId || !confirm("Leave this forum?")) return;

    const { data, error } = await supabase
      .from("group_memberships")
      .delete()
      .eq("unit_id", unitId)
      .eq("user_id", currentUserId)
      .select();

    if (error) {
      console.error("Error leaving unit:", error);
      alert("Could not leave unit. Check console.");
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No membership row found to delete");
      return;
    }

    console.log("Successfully left unit:", data);

    setJoinedUnits((prev) => prev.filter((id) => id !== unitId));
    if (selectedUnit?.id === unitId) {
      setSelectedUnit(null);
      setMessages([]);
    }
  };


  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedUnit || !joinedUnits.includes(selectedUnit.id) || !currentUserId) return;

    // Editing existing message
    if (editingMessageId) {
      const { error } = await supabase
        .from("group_messages")
        .update({ content: messageInput.trim() })
        .eq("id", editingMessageId);

      if (error) {
        console.error("Error updating message:", error);
        return;
      }

      // Update UI
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId ? { ...m, content: messageInput.trim() } : m
        )
      );

      setEditingMessageId(null); // clear edit mode
      setMessageInput("");        // clear input
      return;
    }

    // Sending new message
    const { data, error } = await supabase
      .from("group_messages")
      .insert([
        {
          unit_id: selectedUnit.id,
          user_id: currentUserId,
          content: messageInput.trim(),
          reply_to: replyToMessage?.id || null,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting message:", error);
      return;
    }

    setMessageInput("");
    setReplyToMessage(null);
  };


  // ✅ New messages subscription with reply content
  useEffect(() => {
    if (!selectedUnit) return;

    const channel = supabase
      .channel(`messages-${selectedUnit.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "group_messages",
          filter: `unit_id=eq.${selectedUnit.id}`,
        },
        async (payload: any) => {
          const { eventType } = payload;
          const newMsg = payload.new || payload.record;   // for INSERT & UPDATE
          const oldMsg = payload.old || payload.old_record; // for DELETE

          if (eventType === "INSERT") {
            // Fetch sender profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("user_id", newMsg.user_id)
              .single();

            // Fetch reply content
            let replyContent: string | null = null;
            if (newMsg.reply_to) {
              const { data: replyMsg } = await supabase
                .from("group_messages")
                .select("content")
                .eq("id", newMsg.reply_to)
                .maybeSingle();
              replyContent = replyMsg?.content || "Message deleted";
            }

            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                unit_id: newMsg.unit_id,
                user_id: newMsg.user_id,
                content: newMsg.content,
                created_at: newMsg.created_at,
                sender_name: profile?.name || "Unknown",
                avatar_url: profile?.avatar_url || null,
                reply_to: newMsg.reply_to || null,
                reply_content: replyContent,
              },
            ]);

          } else if (eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === newMsg.id
                  ? {
                    ...m,
                    content: newMsg.deleted ? "This message was deleted" : newMsg.content,
                    deleted: newMsg.deleted,
                  }
                  : m
              )
            );
          }

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUnit]);

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    // Optimistically mark as deleted in UI
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "This message was deleted", deleted: true } : m
      )
    );

    // Soft-delete in database
    const { error } = await supabase
      .from("group_messages")
      .update({ deleted: true })
      .eq("id", messageId);

    if (error) {
      console.error("Error marking message as deleted:", error);
      alert("Could not delete message. Try again.");
      await loadUnitMessages(selectedUnit!);
    }
  };


  const handleEditMessage = (msg: Message) => {
    setMessageInput(msg.content);      // Pre-fill input
    setReplyToMessage(null);           // Clear reply if editing
    setActiveMessageId(null);          // Hide buttons
    setEditingMessageId(msg.id);       // Track which message is being edited
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4 overflow-hidden ">


      {/* Chat Area */}
      <Card className="flex-1 flex flex-col relative">
        {selectedUnit ? (
          joinedUnits.includes(selectedUnit.id) ? (
            <>
              <CardHeader className="border-b shrink-0">
                <CardTitle>{selectedUnit.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedUnit.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{memberCount} members</p>
              </CardHeader>
              {/* 📌 Universal pinned rules banner */}
              <div className="m-3">
                <div
                  className="flex items-center justify-between
               bg-amber-200 dark:bg-amber-700
               text-amber-900 dark:text-amber-50
               px-4 py-2 rounded-t-lg cursor-pointer"
                  onClick={() => setShowRules(!showRules)}
                >
                  <span className="font-semibold">Medrae Brief Group Rules & Purpose</span>
                  <span className="text-sm">{showRules ? "Hide ▲" : "Show ▼"}</span>
                </div>

                {showRules && (
                  <div
                    className="bg-amber-50 dark:bg-amber-900/40
                 border border-amber-200 dark:border-amber-700
                 rounded-b-lg shadow px-4 py-3
                 text-sm leading-relaxed
                 text-amber-900 dark:text-amber-100
                 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto"
                  >
                    Welcome to your <b>academic & professional support group</b>
                    <br /><br />
                    These groups are <b>not casual chat rooms</b>. Features are intentionally limited
                    to keep conversations <b>focused, respectful, and meaningful</b>.
                    Only text messages are allowed <b>no pictures or documents</b>.
                    <br /><br />
                    Here’s what this space is for:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Sharing short academic updates, quick study tips, and helpful reminders</li>
                      <li>Asking brief questions or requesting clarification from peers</li>
                      <li>Offering useful suggestions, encouragement, or professional insights</li>
                      <li>Learning about opportunities, internships, workshops, or events</li>
                      <li>Building supportive friendships and networks within the profession</li>
                    </ul>
                    <br />
                    Please keep messages <b>short, kind, and relevant</b>.
                    Together, we’re creating a <b>safe, supportive, and inspiring community </b>
                    to grow in knowledge, career, and friendship
                  </div>
                )}
              </div>



              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 relative flex flex-col">

                  {/* Centered loader overlay */}
                  {selectedUnit && joinedUnits.includes(selectedUnit.id) && loadingMessages && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <TypingBubbles isDarkTheme={false} />
                    </div>
                  )}

                  <ScrollArea
                    className="flex-1 p-4"
                    ref={messagesContainerRef as any}
                    style={{ paddingBottom: 'calc(64px + 16px)' }} // footer-safe padding
                  >
                    <div className="space-y-4 relative">
                      {/* Existing messages rendering */}
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 relative ${msg.user_id === currentUserId ? "justify-end" : "justify-start"}`}
                          onClick={() => setActiveMessageId(msg.id === activeMessageId ? null : msg.id)} // toggle active
                        >
                          {/* Avatar for other users */}
                          {msg.user_id !== currentUserId && (
                            <Avatar className="h-10 w-10 rounded-full overflow-hidden">
                              {msg.avatar_url ? (
                                <img src={msg.avatar_url} alt={msg.sender_name || "User"} className="object-cover w-full h-full" />
                              ) : (
                                <AvatarFallback>{msg.sender_name?.[0]}</AvatarFallback>
                              )}
                            </Avatar>
                          )}

                          <div className="flex flex-col max-w-[95%]">
                            <span className="text-xs font-semibold text-muted-foreground mb-1">
                              {msg.sender_name}
                            </span>

                            {msg.reply_to && (
                              <div className="mb-1 px-2 py-1 rounded bg-black/10 dark:bg-black/30 text-xs italic">
                                Replying to: {msg.reply_content || "Message deleted"}
                              </div>
                            )}

                            <div
                              className={`px-4 py-2 rounded-lg ${msg.user_id === currentUserId
                                ? "bg-green-300 dark:bg-green-600 text-white rounded-tr-none"
                                : "bg-gray-100 dark:bg-gray-700 text-green rounded-tl-none"
                                }`}
                            >
                              <p className="text-sm">
                                {msg.deleted ? (
                                  <em className="text-gray-500 italic">{msg.content}</em>
                                ) : (
                                  msg.content
                                )}
                              </p>

                              <span className={`text-[10px] mt-1 block text-right font-semibold drop-shadow-md ${msg.user_id === currentUserId
                                ? "text-grey-900 dark:text-grey-900"
                                : "text-grey-900"
                                }`}>
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>

                            {activeMessageId === msg.id && msg.user_id === currentUserId && (
                              <div className="flex gap-2 mt-1 ml-auto">
                                <button
                                  className="px-2 py-1 bg-red-100 dark:bg-red-800 text-white rounded text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMessage(msg.id);
                                    setActiveMessageId(null);
                                  }}
                                >
                                  Delete
                                </button>
                                <button
                                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-white rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMessage(msg);
                                    setActiveMessageId(null);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-1 text-xs text-blue-500 cursor-pointer"
                            onClick={() => setReplyToMessage(msg)}>
                            Reply
                          </div>

                          {msg.user_id === currentUserId && (
                            <Avatar className="h-10 w-10">
                              {msg.avatar_url ? (
                                <img src={msg.avatar_url} alt="You" />
                              ) : (
                                <AvatarFallback>Y</AvatarFallback>
                              )}
                            </Avatar>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>
                {replyToMessage && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-1 rounded mb-1 text-sm flex justify-between items-center">
                    Replying to: {replyToMessage.sender_name}
                    <button
                      className="ml-2 text-red-500 font-bold"
                      onClick={() => setReplyToMessage(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input + Send + Forum Selector */}
                <div
                  className="border-t p-4 bg-card flex gap-2 items-center"
                  style={{ paddingBottom: 'calc(64px + 16px)' }} // footer-safe padding
                >
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>

                  {/* Forum Selector Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-slate-600 hover:bg-slate-700 text-white flex items-center gap-2 shadow-lg">
                        Forums
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 max-h-[80vh] overflow-hidden p-0">
                      <Card className="flex flex-col h-[80vh] shadow-xl dark:bg-gray-900 bg-white transition-all duration-300">
                        <CardHeader className="sticky top-0 bg-card z-10 shadow-sm">
                          <CardTitle>Discussions, School, Career, Units, Forums</CardTitle>
                          <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground/80" />
                            <Input
                              placeholder="Search discussions..."
                              className="pl-10"
                              value={unitSearch}
                              onChange={(e) => setUnitSearch(e.target.value)}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                          <ScrollArea className="h-[calc(80vh-4rem)]">
                            <div className="space-y-2 px-4 mt-2">
                              {loadingUnits ? (
                                <div className="flex items-center justify-center py-4">
                                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-500"></div>
                                </div>
                              ) : units.length > 0 ? (
                                units
                                  .filter((u) =>
                                    u.name.toLowerCase().includes(unitSearch.toLowerCase())
                                  )
                                  .sort((a, b) => {
                                    const aJoined = joinedUnits.includes(a.id);
                                    const bJoined = joinedUnits.includes(b.id);

                                    if (aJoined && !bJoined) return -1; // a first
                                    if (!aJoined && bJoined) return 1;  // b first
                                    return a.name.localeCompare(b.name); // optional: sort by name if both joined or both not joined
                                  })
                                  .map((unit) => (
                                    <div
                                      key={unit.id}
                                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all duration-200 ${selectedUnit?.id === unit.id
                                        ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                        }`}
                                      onClick={() => handleSelectUnit(unit)}
                                    >
                                      <span>{unit.name}</span>
                                      {joinedUnits.includes(unit.id) ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            leaveUnit(unit.id);
                                          }}
                                        >
                                          Leave
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            joinUnit(unit.id);
                                          }}
                                        >
                                          Join
                                        </Button>
                                      )}
                                    </div>
                                  ))
                              ) : (
                                <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                                  No discussions found.
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>

                      </Card>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
              Join this unit to view and send messages. By joining, you’ll be able to
              connect with peers, share quick updates, ask for help, and explore study
              and career opportunities. Please remember this space is for short, focused,
              and respectful exchanges only.
            </div>
          )
        ) : (

          <>

            <div className="relative flex flex-col items-center justify-center flex-1 text-center gap-6 text-black dark:text-white overflow-hidden">


              {/* Overlay for dark mode only */}
              <div className="absolute inset-0 bg-black/0 dark:bg-black/20 pointer-events-none" />


              {/* Encouragement & purpose text */}
              <div className="relative z-10 max-w-xl px-4">
                <h1 className="text-3xl font-extrabold drop-shadow-md">
                  Welcome to Medrae Forums
                </h1>
                <p className="mt-3 text-lg leading-relaxed font-medium drop-shadow">
                  This space is designed to uplift, guide, and connect you with peers
                  and mentors. Every forum here is a chance to learn, grow, and build
                  meaningful support.
                  <br /><br />
                  Think of this page as your safe corner to spark motivation,
                  share wisdom, and remind yourself:{" "}
                  <b>you’re not alone in the journey</b>.
                </p>
              </div>


              {/* Floating forum selector button */}
              <div className="relative z-10 mt-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex flex-col items-center">
                      <span className="mb-2 text-lg font-semibold">Browse Forums</span>
                      <Button
                        className="rounded-full bg-primary text-white shadow-2xl
           p-6 hover:bg-primary/90 transition-all duration-300"
                      >
                        <Send className="h-12 w-12" />
                      </Button>
                    </div>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="w-[90vw] max-w-sm max-h-[60vh]" // removed overflow-y-auto
                    avoidCollisions={false}
                  >
                    <Card className="flex flex-col shadow-xl dark:bg-gray-900 bg-white transition-all duration-300">
                      <CardHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <CardTitle>Discussions, School, Career, Units, Forums</CardTitle>
                        <div className="relative mt-0"> {/* flush header */}
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground/80" />
                          <Input
                            placeholder="Search discussions..."
                            className="pl-10"
                            value={unitSearch}
                            onChange={(e) => setUnitSearch(e.target.value)}
                          />
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 p-0">
                        <ScrollArea className="h-[calc(60vh-4rem)]"> {/* fills remaining space */}
                          <div className="space-y-2 px-4 mt-0"> {/* flush top */}
                            {loadingUnits ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-500"></div>
                              </div>
                            ) : units.length > 0 ? (
                              units
                                .filter((u) =>
                                  u.name.toLowerCase().includes(unitSearch.toLowerCase())
                                )
                                .sort((a, b) => {
                                  const aJoined = joinedUnits.includes(a.id);
                                  const bJoined = joinedUnits.includes(b.id);

                                  if (aJoined && !bJoined) return -1; // a first
                                  if (!aJoined && bJoined) return 1;  // b first
                                  return a.name.localeCompare(b.name); // optional: sort by name if both joined or both not joined
                                })
                                .map((unit) => (
                                  <div
                                    key={unit.id}
                                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all duration-200 ${selectedUnit?.id === unit.id
                                      ? "bg-blue-600 text-white dark:bg-blue-500 dark:text-white"
                                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                      }`}
                                    onClick={() => handleSelectUnit(unit)}
                                  >
                                    <span>{unit.name}</span>
                                    {joinedUnits.includes(unit.id) ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          leaveUnit(unit.id);
                                        }}
                                      >
                                        Leave
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          joinUnit(unit.id);
                                        }}
                                      >
                                        Join
                                      </Button>
                                    )}
                                  </div>
                                ))
                            ) : (
                              <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                                No discussions found.
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          </>

        )}
      </Card>
    </div >
  );
}