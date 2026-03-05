import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // adjust import path to your setup
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Pin, Calendar, Users, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust the path if needed

export function Announcements() {
  const [readAnnouncements, setReadAnnouncements] = useState<string[]>(() => {
    // Load read announcements from localStorage
    const stored = localStorage.getItem("readAnnouncements");
    return stored ? JSON.parse(stored) : [];
  });

  const [announcements, setAnnouncements] = useState<any[]>(() => {
    // Load cached announcements from localStorage
    const stored = localStorage.getItem("announcements");
    return stored ? JSON.parse(stored) : [];
  });

  const [loading, setLoading] = useState(announcements.length === 0); // only show loader if no cached data

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
        localStorage.setItem("announcements", JSON.stringify(data)); // update cache
      }
    } catch (err) {
      console.error("Unexpected error fetching announcements:", err);
    }
    setLoading(false);
  };

  const markAsRead = (id: string) => {
    setReadAnnouncements((prev) => {
      const updated = [...prev, id];
      localStorage.setItem("readAnnouncements", JSON.stringify(updated)); // save to localStorage
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
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "update":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "achievement":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "policy":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "event":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
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
    return <GlobalLoader message="Fetching announcements..." />;
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)]  ">
      <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center gap-2">

              Announcements
            </h1>
            <p className="text-muted-foreground mt-2">
              Stay updated with important notifications and updates
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        <Tabs defaultValue="all" className="space-y-2">
          <TabsList>
            <TabsTrigger value="all">All ({announcements.length})</TabsTrigger>
            <TabsTrigger value="pinned">Pinned ({pinnedAnnouncements.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          </TabsList>

          {/* All */}
          <TabsContent value="all" className="space-y-2">
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Pin className="h-5 w-5" />
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
            <div className="space-y-1">
              {pinnedAnnouncements.length > 0 && (
                <h3 className="text-lg font-semibold">Recent Announcements</h3>
              )}
              {regularAnnouncements.map((a) => (
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
          </TabsContent>

          {/* Pinned */}
          <TabsContent value="pinned" className="space-y-4">
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
          </TabsContent>

          {/* Unread */}
          <TabsContent value="unread" className="space-y-4">
            {announcements
              .filter((a) => !readAnnouncements.includes(a.id))
              .map((a) => (
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
          </TabsContent>
        </Tabs>
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
  return (
    <Card
      className={`${!readAnnouncements.includes(announcement.id) ? "bg-muted/20 border-0" : ""}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {announcement.pinned && <Pin className="h-4 w-4 text-primary" />}
              <CardTitle className="text-lg">{announcement.title}</CardTitle>
              <div
                className={`h-2 w-2 rounded-full ${getPriorityColor(announcement.priority)}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(announcement.type)}>
                {getTypeIcon(announcement.type)}
                <span className="ml-1 capitalize">{announcement.type}</span>
              </Badge>
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {announcement.visible_to}
              </Badge>
            </div>
          </div>
          {!readAnnouncements.includes(announcement.id) && (
            <Button size="sm" variant="outline" onClick={() => markAsRead(announcement.id)}>
              Mark as Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base mb-4">
          {announcement.content}
        </CardDescription>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={announcement.author_avatar || "/placeholder.svg"}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                {announcement.author
                  ? announcement.author.split(" ").map((n: string) => n[0]).join("")
                  : "??"}
              </AvatarFallback>
            </Avatar>
            <span>{announcement.author || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{formatDate(announcement.created_at)}</span>
            {announcement.expires_at && (
              <span className="text-orange-600">
                Expires: {formatDate(announcement.expires_at)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
