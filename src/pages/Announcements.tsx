import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Pin, Calendar, Users, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";

export function Announcements() {
  const [readAnnouncements, setReadAnnouncements] = useState<string[]>(() => {
    const stored = localStorage.getItem("readAnnouncements");
    return stored ? JSON.parse(stored) : [];
  });

  const [announcements, setAnnouncements] = useState<any[]>(() => {
    const stored = localStorage.getItem("announcements");
    return stored ? JSON.parse(stored) : [];
  });

  const [loading, setLoading] = useState(announcements.length === 0);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_published", true)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
      } else if (data) {
        setAnnouncements(data);
        localStorage.setItem("announcements", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Unexpected error fetching announcements:", err);
    }
    setLoading(false);
  };

  const markAsRead = (id: string) => {
    setReadAnnouncements((prev) => {
      const updated = [...prev, id];
      localStorage.setItem("readAnnouncements", JSON.stringify(updated));
      return updated;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "maintenance":
        return <AlertCircle className="h-4 w-4" />;
      case "update":
        return <Info className="h-4 w-4" />;
      case "achievement":
        return <CheckCircle className="h-4 w-4" />;
      case "policy":
        return <XCircle className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "update":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "achievement":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "policy":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "event":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = announcements.filter((a) => !readAnnouncements.includes(a.id)).length;
  const pinnedAnnouncements = announcements.filter((a) => a.pinned);
  const regularAnnouncements = announcements.filter((a) => !a.pinned);

  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-gray-50 dark:bg-background">
      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-0 md:space-y-4 px-0 md:px-4 py-0 md:py-4">

        {/* Header - Mobile Native */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center gap-2">
              Stay updated with important Announcements
            </h1>

          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1 shrink-0">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        {/* Tabs - Mobile Native */}
        <div className="px-4 md:px-0">
          <Tabs defaultValue="all" className="space-y-2">
            <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex">
              <TabsTrigger value="all" className="text-xs md:text-sm">All ({announcements.length})</TabsTrigger>
              <TabsTrigger value="pinned" className="text-xs md:text-sm">Pinned ({pinnedAnnouncements.length})</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs md:text-sm">Unread ({unreadCount})</TabsTrigger>
            </TabsList>

            {/* All */}
            <TabsContent value="all" className="space-y-0 md:space-y-4">
              {pinnedAnnouncements.length > 0 && (
                <div className="space-y-3 md:space-y-4 px-4 md:px-0 pt-3 md:pt-0">
                  <h3 className="text-sm md:text-lg font-semibold flex items-center gap-2">
                    <Pin className="h-4 w-4 md:h-5 md:w-5" />
                    Pinned Announcements
                  </h3>
                  {pinnedAnnouncements.map((a) => (
                    <AnnouncementCard
                      key={a.id}
                      announcement={a}
                      markAsRead={markAsRead}
                      readAnnouncements={readAnnouncements}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                      getPriorityColor={getPriorityColor}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}

              {/* Regular */}
              <div className="space-y-0 md:space-y-1">
                {pinnedAnnouncements.length > 0 && (
                  <h3 className="text-sm md:text-lg font-semibold px-4 md:px-0 pt-3 md:pt-0">Recent Announcements</h3>
                )}
                {regularAnnouncements.map((a, index) => (
                  <div key={a.id}>
                    <AnnouncementCard
                      announcement={a}
                      markAsRead={markAsRead}
                      readAnnouncements={readAnnouncements}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                      getPriorityColor={getPriorityColor}
                      formatDate={formatDate}
                    />
                    {/* Mobile Separator */}
                    {index < regularAnnouncements.length - 1 && (
                      <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50 mx-4" />
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Pinned */}
            <TabsContent value="pinned" className="space-y-0 md:space-y-4">
              {pinnedAnnouncements.map((a, index) => (
                <div key={a.id}>
                  <AnnouncementCard
                    announcement={a}
                    markAsRead={markAsRead}
                    readAnnouncements={readAnnouncements}
                    getTypeIcon={getTypeIcon}
                    getTypeColor={getTypeColor}
                    getPriorityColor={getPriorityColor}
                    formatDate={formatDate}
                  />
                  {index < pinnedAnnouncements.length - 1 && (
                    <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50 mx-4" />
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Unread */}
            <TabsContent value="unread" className="space-y-0 md:space-y-4">
              {announcements
                .filter((a) => !readAnnouncements.includes(a.id))
                .map((a, index) => (
                  <div key={a.id}>
                    <AnnouncementCard
                      announcement={a}
                      markAsRead={markAsRead}
                      readAnnouncements={readAnnouncements}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                      getPriorityColor={getPriorityColor}
                      formatDate={formatDate}
                    />
                    {index < announcements.filter((a) => !readAnnouncements.includes(a.id)).length - 1 && (
                      <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50 mx-4" />
                    )}
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AnnouncementCard({
  announcement,
  markAsRead,
  readAnnouncements,
  getTypeIcon,
  getTypeColor,
  getPriorityColor,
  formatDate,
}: any) {
  const isUnread = !readAnnouncements.includes(announcement.id);

  return (
    <Card className={`border-0 md:border rounded-none md:rounded-xl shadow-none md:shadow-sm dark:bg-muted/30 ${isUnread ? "bg-muted/10 dark:bg-muted/20" : ""}`}>
      <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
          <div className="space-y-2 md:space-y-2">
            <div className="flex items-center flex-wrap gap-1.5 md:gap-2">
              {announcement.pinned && <Pin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />}
              <CardTitle className="text-sm md:text-lg font-bold">{announcement.title}</CardTitle>
              <div className={`h-1.5 w-1.5 md:h-2 md:w-2 rounded-full ${getPriorityColor(announcement.priority)} shrink-0`} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <Badge className={`${getTypeColor(announcement.type)} text-[10px] md:text-xs border-0`}>
                {getTypeIcon(announcement.type)}
                <span className="ml-1 capitalize">{announcement.type}</span>
              </Badge>
              <Badge variant="outline" className="text-[10px] md:text-xs">
                <Users className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                {announcement.visible_to}
              </Badge>
            </div>
          </div>
          {isUnread && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAsRead(announcement.id)}
              className="text-xs md:text-sm shrink-0"
            >
              Mark as Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
        <CardDescription className="text-sm md:text-base mb-3 md:mb-4">
          {announcement.content}
        </CardDescription>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] md:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Avatar className="h-5 w-5 md:h-6 md:w-6">
              <AvatarImage
                src={announcement.author_avatar || "/placeholder.svg"}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-[8px] md:text-[10px]">
                {announcement.author
                  ? announcement.author.split(" ").map((n: string) => n[0]).join("")
                  : "??"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[100px] md:max-w-none">{announcement.author || "Unknown"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <span>{formatDate(announcement.created_at)}</span>
            {announcement.expires_at && (
              <span className="text-orange-600 dark:text-orange-400 text-[10px] md:text-xs">
                Expires: {formatDate(announcement.expires_at)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}