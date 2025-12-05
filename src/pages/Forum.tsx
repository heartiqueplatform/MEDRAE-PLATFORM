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
  id: string;
  unit_id: number;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  avatar_url?: string;
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


  const [loadingUnits, setLoadingUnits] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Load unit messages
  const loadUnitMessages = async (unit: Unit) => {
    if (!joinedUnits.includes(unit.id)) {
      setMessages([]);
      return;
    }
    const { data: msgs } = await supabase
      .from("group_messages")
      .select(`*, profiles(name, avatar_url)`)
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true });

    setMessages(
      (msgs || []).map((m: any) => ({
        id: m.id.toString(),
        unit_id: m.unit_id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        sender_name: m.profiles?.name || "Unknown",
        avatar_url: m.profiles?.avatar_url,
      }))
    );
  };

  const handleSelectUnit = async (unit: Unit) => {
    setSelectedUnit(unit);

    // Always try to load messages
    const { data: msgs } = await supabase
      .from("group_messages")
      .select(`*, profiles(name, avatar_url)`)
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true });

    if (msgs && msgs.length > 0) {
      setMessages(
        msgs.map((m: any) => ({
          id: m.id.toString(),
          unit_id: m.unit_id,
          user_id: m.user_id,
          content: m.content,
          created_at: m.created_at,
          sender_name: m.profiles?.name || "Unknown",
          avatar_url: m.profiles?.avatar_url,
        }))
      );
    } else {
      setMessages([]);
    }
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
    if (
      !messageInput.trim() ||
      !selectedUnit ||
      !joinedUnits.includes(selectedUnit.id) ||
      !currentUserId
    ) {
      return;
    }

    const { data, error } = await supabase
      .from("group_messages")
      .insert([
        {
          unit_id: selectedUnit.id,
          user_id: currentUserId,
          content: messageInput.trim(),
        },
      ])
      .select(); // 👈 return inserted row for debugging

    if (error) {
      console.error("Error inserting message:", error);
      return;
    }

    console.log("Inserted message:", data);

    setMessageInput("");
  };

  // ✅ New messages subscription
  useEffect(() => {
    if (!selectedUnit) return;

    const channel = supabase
      .channel(`messages-${selectedUnit.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `unit_id=eq.${selectedUnit.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", newMsg.user_id)  // ✅ FIXED
            .single();


          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id.toString(),
              unit_id: newMsg.unit_id,
              user_id: newMsg.user_id,
              content: newMsg.content,
              created_at: newMsg.created_at,
              sender_name: profile?.name || "Unknown",
              avatar_url: profile?.avatar_url || null,
            },
          ]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedUnit]);

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4 overflow-hidden">


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
                <ScrollArea className="flex-1 p-4" ref={messagesContainerRef as any}>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div

                        key={msg.id}
                        className={`flex items-start gap-3 ${msg.user_id === currentUserId ? "justify-end" : "justify-start"
                          }`}
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
                          {/* Sender name above message */}
                          <span className="text-xs font-semibold text-muted-foreground mb-1">
                            {msg.sender_name}
                          </span>

                          <div
                            className={`px-4 py-2 rounded-lg ${msg.user_id === currentUserId
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-muted text-muted-foreground rounded-tl-none"
                              }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>

                        {/* Avatar for current user */}
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


                {/* Input + Send + Forum Selector */}
                <div className="border-t p-4 bg-card flex gap-2 items-center">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
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
                      <Card className="flex flex-col shadow-xl dark:bg-gray-900 bg-white transition-all duration-300">
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
                        <CardContent className="flex-1 p-0 overflow-y-auto">
                          <ScrollArea className="h-full">
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
                    className="w-[90vw] max-w-sm max-h-[60vh] overflow-y-auto"
                    avoidCollisions={false}
                  >
                    <Card className="flex flex-col shadow-xl dark:bg-gray-900 bg-white transition-all duration-300">
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
                      <CardContent className="flex-1 p-0 overflow-y-auto">
                        <ScrollArea className="h-full">
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
    </div>
  );
}
