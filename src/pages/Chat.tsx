"use client";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed
import { supabase, sql } from '@/lib/supabaseClient'; // if your client exports sql

import { useState, useEffect, useRef } from "react";
import {
  Send,
  MessageCircle,
  Plus,
  Search,
  MoreVertical,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  user_id: string;
  name: string;
  phone: string;
  avatar_url?: string;
  last_seen?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  sender_name?: string;
  avatar_url?: string;
  read_by?: string[];
  chat_id?: string;
}

export function Chat() {

  const [showRules, setShowRules] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const getAvatarUrl = (path?: string) => {
    if (!path) return undefined;

    // If path is already a full URL, just return it
    if (path.startsWith("http")) return path;

    // Otherwise, generate public URL from Supabase Storage
    const { data } = supabase.storage.from("profilepics").getPublicUrl(path);
    return data?.publicUrl || undefined;
  };
  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );


  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch current user & all profiles
  useEffect(() => {
    let channel: any;

    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoadingProfiles(false);
        return;
      }

      setCurrentUserId(user.id);

      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("user_id", user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, phone, avatar_url, last_seen");

      if (error) console.error("Error fetching profiles:", error);
      else {
        setProfiles(
          (data || [])
            .filter((p) => p.user_id !== user.id)
            .map((p) => ({ ...p, unread_count: 0 }))
        );
      }
      setLoadingProfiles(false);

      // --- REAL-TIME SUBSCRIPTION ---
      channel = supabase
        .channel("profiles")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          (payload) => {
            if (payload.new.user_id === user.id) return; // skip current user
            setProfiles((prev) => {
              const exists = prev.find((p) => p.user_id === payload.new.user_id);
              if (exists) {
                // Update existing profile
                return prev.map((p) =>
                  p.user_id === payload.new.user_id ? { ...p, ...payload.new } : p
                );
              } else {
                // Add new profile
                return [...prev, { ...payload.new, unread_count: 0 }];
              }
            });
          }
        )
        .subscribe();
    };

    fetchProfiles();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);


  // Load chat & subscribe to selected chat
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    let channel: any;

    const loadChat = async () => {
      // Find existing chat or create new one
      const { data: existingChats } = await supabase
        .from("chats")
        .select("*")
        .eq("chat_type", "private")
        .contains("participants", [currentUserId, selectedUser.user_id]);

      let chat = existingChats?.[0];
      if (!chat) {
        const { data: newChat } = await supabase
          .from("chats")
          .insert({
            chat_type: "private",
            participants: [currentUserId, selectedUser.user_id],
            created_by: currentUserId,
          })
          .select()
          .single();
        chat = newChat;
      }
      if (!chat) return;

      setChatId(chat.id);

      // Fetch existing messages
      const { data: msgs } = await supabase
        .from("messages")
        .select(
          `
          id,
          sender_id,
          message_text,
          created_at,
          read_by,
          chat_id,
          profiles(name, avatar_url)
        `
        )
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });
      // Mark messages as read for current user
      await supabase
        .from("messages")
        .update({
          read_by: supabase.raw('array_append(read_by, ?)', [currentUserId])
        })
        .contains("delivered_to", [currentUserId])
        .not("read_by", "cs", [currentUserId]);

      const mapped = (msgs || []).map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        message_text: m.message_text,
        created_at: m.created_at,
        chat_id: m.chat_id,
        sender_name: m.profiles?.name,
        avatar_url: m.profiles?.avatar_url,
        read_by: m.read_by,
      }));

      const pinnedMessage: Message = {
        id: "pinned-msg",
        sender_id: "system",
        message_text:
          "Welcome to your personal academic and professional support chat. This is not a casual chat room features are intentionally limited to keep the conversation focused, respectful, and meaningful. Only text messages are allowed, no pictures or documents. This space is meant for exchanging quick study updates, tips, and reminders; asking brief questions or requesting clarification directly; sharing encouragement, professional insights, or guidance; and passing along opportunities such as internships, workshops, or events. It is also a place for building supportive one-to-one academic and career connections. Please keep messages short, kind, and relevant. Together, we’re creating a safe, supportive, and inspiring space to grow in knowledge, career, and friendship.",
        created_at: new Date().toISOString(),
        sender_name: "Admin",
        avatar_url: "",
        read_by: [currentUserId],
      };



      setMessages([pinnedMessage, ...mapped]);

      // Reset unread count locally
      setProfiles((prev) =>
        prev.map((p) =>
          p.user_id === selectedUser.user_id ? { ...p, unread_count: 0 } : p
        )
      );

    };

    loadChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedUser, currentUserId]);

  // Global listener for all incoming messages (updates unread counts instantly)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("all-chats")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const m = payload.new as Message & { chat_id: string; sender_id: string };

          // Only act if current user is part of the chat
          const { data: chatData } = await supabase
            .from("chats")
            .select("participants")
            .eq("id", m.chat_id)
            .single();

          if (!chatData?.participants.includes(currentUserId)) return;

          // Update unread count for the sender
          if (m.sender_id !== currentUserId) {
            setProfiles((prev) =>
              prev.map((p) =>
                p.user_id === m.sender_id
                  ? { ...p, unread_count: (p.unread_count || 0) + 1 }
                  : p
              )
            );
          }

          // Append to messages if currently chatting with this user
          if (
            selectedUser &&
            m.sender_id === selectedUser.user_id &&
            m.chat_id === chatId
          ) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("user_id", m.sender_id)
              .single();

            setMessages((prev) => [
              ...prev,
              {
                id: m.id,
                sender_id: m.sender_id,
                message_text: m.message_text,
                created_at: m.created_at,
                sender_name: profileData?.name || selectedUser.name,
                avatar_url: profileData?.avatar_url || selectedUser.avatar_url,
                read_by: m.read_by,
                chat_id: m.chat_id,
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedUser, chatId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chatId || !currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      sender_id: currentUserId,
      message_text: messageInput.trim(),
      created_at: new Date().toISOString(),
      sender_name: "You",
      avatar_url: undefined,
      read_by: [currentUserId],
      chat_id: chatId,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");

    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: currentUserId,
      message_text: newMessage.message_text,
      message_type: "text",
      read_by: [currentUserId],
    });

    if (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId) return;
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) console.error("Error deleting chat:", error);
    else {
      setSelectedUser(null);
      setMessages([]);
      setChatId(null);
    }
  };

  return (
    <div className="h-screen flex gap-4 overflow-hidden">

      {/* Chat Area */}
      <Card className="relative flex-1 flex flex-col overflow-hidden">
        {selectedUser ? (<>
          <CardHeader className="border-b sticky top-0 bg-background z-10">
            {/* 📌 Universal pinned rules banner */}



            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={getAvatarUrl(selectedUser.avatar_url)}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    {selectedUser.name ? selectedUser.name[0] : "?"}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.last_seen
                      ? `Last seen ${new Date(selectedUser.last_seen).toLocaleString()}`
                      : "Last seen unknown"}
                  </p>
                </div>
              </div>


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-red-600"
                            onSelect={(e) => e.preventDefault()} // prevent DropdownMenu from closing weirdly
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Chat
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the entire chat history between you and{" "}
                              <span className="font-semibold">{selectedUser?.name}</span>.
                              Once deleted, neither of you will be able to view these messages again.
                              This action cannot be undone.
                            </AlertDialogDescription>

                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={async () => {
                                await handleDeleteChat();
                                setDeleteDialogOpen(false); // close after deletion
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the entire chat history between you and{" "}
                          <span className="font-semibold">{selectedUser?.name}</span>.
                          Once deleted, neither of you will be able to view these messages again.
                          This action cannot be undone.
                        </AlertDialogDescription>

                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteChat}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <div className="m-3">
            <div
              className="flex items-center justify-between 
               bg-amber-200 dark:bg-amber-700 
               text-amber-900 dark:text-amber-50
               px-4 py-2 rounded-t-lg cursor-pointer"
              onClick={() => setShowRules(!showRules)}
            >
              <span className="font-semibold">Medrae Brief Chat Rules & Purpose</span>
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
                Welcome to your <b>personal academic & professional support chat</b>
                <br /><br />
                This is <b>not a casual chat room</b>. Features are intentionally limited
                to keep the conversation <b>focused, respectful, and meaningful</b>.
                Only text messages are allowed <b>no pictures or documents</b>.
                <br /><br />
                Here’s what this space is for:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Exchanging quick study updates, tips, and useful reminders</li>
                  <li>Asking brief questions or requesting clarification directly</li>
                  <li>Sharing encouragement, professional insights, or guidance</li>
                  <li>Passing along opportunities like internships, workshops, or events</li>
                  <li>Building supportive one-to-one academic or career connections</li>
                </ul>
                <br />
                Please keep messages <b>short, kind, and relevant</b>.
                Together, we’re creating a <b>safe, supportive, and inspiring space</b>
                to grow in knowledge, career, and friendship
              </div>
            )}
          </div>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender_id === currentUserId
                      ? "justify-end"
                      : "justify-start"
                      }`}
                  >
                    {message.sender_id !== currentUserId && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={getAvatarUrl(message.avatar_url)}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-xs">
                          {message.sender_name ? message.sender_name[0] : "?"}
                        </AvatarFallback>
                      </Avatar>

                    )}
                    <div className="flex flex-col max-w-[95%]">


                      {message.sender_id !== currentUserId && (
                        <p className="text-sm font-medium mb-1">
                          {message.sender_name}
                        </p>
                      )}
                      <div
                        className={`rounded-lg p-3 max-w-[95%] ${message.sender_id === currentUserId
                          ? "bg-primary text-primary-foreground text-right"
                          : "bg-muted text-left"
                          }`}
                      >
                        <p className="text-sm">{message.message_text}</p>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-[90vw] max-w-sm max-h-[60vh] overflow-y-auto"
                    avoidCollisions={false}
                  >

                    {/* Search + People List (same as before) */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-semibold">Choose Someone</span>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search people..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <Tabs defaultValue="all" className="w-full">
                      <TabsList className="grid w-full grid-cols-1 px-3 mb-2">
                        <TabsTrigger value="all">All People</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all" className="mt-0">
                        <ScrollArea className="h-[300px] px-3">
                          <div className="space-y-1">
                            {loadingProfiles ? (
                              <div className="flex items-center justify-center h-60">
                                <GlobalLoader />
                              </div>
                            ) : filteredProfiles.length > 0 ? (
                              filteredProfiles.map((profile) => (
                                <div
                                  key={profile.user_id}
                                  className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 ${selectedUser?.user_id === profile.user_id
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50"
                                    }`}
                                  onClick={() => setSelectedUser(profile)}
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={getAvatarUrl(profile.avatar_url)}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-sm">
                                      {profile.name ? profile.name[0].toUpperCase() : "?"}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate flex justify-between">
                                      <span>{profile.name}</span>
                                      {profile.unread_count ? (
                                        <span className="bg-primary text-white rounded-full px-2 text-xs">
                                          {profile.unread_count}
                                        </span>
                                      ) : null}
                                    </h4>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {profile.phone}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-sm text-muted-foreground py-4">
                                No people found
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Message input */}
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </>
        ) : (
          <>
            <div className="relative flex flex-col items-center justify-center flex-1 text-center gap-6 text-black dark:text-white overflow-hidden">


              {/* Overlay for dark mode only */}
              <div className="absolute inset-0 bg-black/0 dark:bg-black/20 pointer-events-none" />


              {/* Encouragement & purpose text */}
              <div className="relative z-10 max-w-xl px-4">
                <h1 className="text-3xl font-extrabold drop-shadow-md">
                  Welcome to Medrae Chat
                </h1>
                <p className="mt-3 text-lg leading-relaxed font-medium drop-shadow">
                  This space is designed to uplift, guide, and connect you with peers
                  and mentors. Every conversation here is a chance to learn, grow,
                  and build meaningful support.
                  <br /><br />
                  Think of this page as your safe corner to spark motivation,
                  share wisdom, and remind yourself: <b>you’re not alone in the journey</b>.
                </p>
              </div>

              {/* Floating chat icon with DropdownMenu */}
              <div className="relative z-10 mt-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex flex-col items-center">
                      <span className="mb-2 text-lg font-semibold">Start a Chat</span>
                      <Button
                        className="rounded-full bg-primary text-white shadow-2xl 
                         p-6 hover:bg-primary/90 transition-all duration-300"
                      >
                        <MessageCircle className="h-12 w-12" />
                      </Button>
                    </div>
                  </DropdownMenuTrigger>

                  {/* Dropdown list (unchanged) */}
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="w-[90vw] max-w-sm max-h-[60vh] overflow-y-auto"
                    avoidCollisions={false}
                  >
                    {/*Same people list */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-semibold">Choose Someone</span>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search people..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[300px] px-3">
                      <div className="space-y-1">
                        {loadingProfiles ? (
                          <div className="flex items-center justify-center h-[200px]">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-primary border-solid"></div>
                          </div>
                        ) : filteredProfiles.length > 0 ? (
                          filteredProfiles.map((profile) => (
                            <div
                              key={profile.user_id}
                              className="p-3 rounded-lg cursor-pointer flex items-center gap-3 hover:bg-muted/50"
                              onClick={() => {
                                setSelectedUser(profile);
                                document.body.click(); // close menu
                              }}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={getAvatarUrl(profile.avatar_url)}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-sm">
                                  {profile.name ? profile.name[0].toUpperCase() : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{profile.name}</h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {profile.phone}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                            No profiles found
                          </div>
                        )}
                      </div>
                    </ScrollArea>


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
