import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Pin, Calendar, Users, AlertCircle, Info, CheckCircle, XCircle, Mail } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";

/* ============================================================
   BRAND ICONS — exact SVG paths, no dependencies
   ============================================================ */
const FacebookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

/* ============================================================
   SOCIAL LINKS CONFIG — your real accounts
   ============================================================ */
const SOCIAL_LINKS = {
  facebook: "https://web.facebook.com/share/g/1AY4nC9Hcp/",
  whatsapp: "https://wa.me/254704473503",           // 0704473503 → international
  tiktok: "https://www.tiktok.com/@medraenursing",
  instagram: "https://www.instagram.com/medraenursing",
  email: "mailto:medraenursing@gmail.com",
};

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
        return "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300";
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
        return "bg-slate-500";
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
    <div className="min-h-screen w-full bg-slate-50/50 dark:bg-background pb-16 md:pb-10">
      <div className="w-full max-w-4xl mx-auto px-1 pt-4 space-y-4">

        {/* ============================================ */}
        {/* HEADER + SOCIAL STRIP — edge to edge on mobile */}
        {/* ============================================ */}
        <div className="w-full">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Announcements
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Stay updated with important updates from the Medrae team
              </p>
            </div>
            {unreadCount > 0 && (
              <Badge className="px-1.5 py-1 shrink-0 border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-normal text-xs self-start">
                {unreadCount} unread
              </Badge>
            )}
          </div>

          {/* Social strip — borderless, brand-colored icons */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
              Follow us
            </span>

            {/* Facebook */}
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Medrae on Facebook"
              className="group flex items-center gap-2 h-9 px-3 rounded-xl border-0
                bg-[#1877F2]/10 hover:bg-[#1877F2]/20
                text-[#1877F2]
                transition-colors active:scale-95"
            >
              <FacebookIcon className="w-4 h-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Facebook</span>
            </a>

            {/* WhatsApp */}
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Medrae on WhatsApp"
              className="group flex items-center gap-2 h-9 px-3 rounded-xl border-0
                bg-[#25D366]/10 hover:bg-[#25D366]/20
                text-[#128C7E] dark:text-[#25D366]
                transition-colors active:scale-95"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span className="text-[11px] font-medium hidden sm:inline">WhatsApp</span>
            </a>

            {/* TikTok */}
            <a
              href={SOCIAL_LINKS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Medrae on TikTok"
              className="group flex items-center gap-2 h-9 px-3 rounded-xl border-0
                bg-slate-900/10 hover:bg-slate-900/20
                dark:bg-white/10 dark:hover:bg-white/20
                text-slate-900 dark:text-white
                transition-colors active:scale-95"
            >
              <TikTokIcon className="w-4 h-4" />
              <span className="text-[11px] font-medium hidden sm:inline">TikTok</span>
            </a>

            {/* Instagram */}
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Medrae on Instagram"
              className="group flex items-center gap-2 h-9 px-3 rounded-xl border-0
                bg-[#E1306C]/10 hover:bg-[#E1306C]/20
                text-[#E1306C]
                transition-colors active:scale-95"
            >
              <InstagramIcon className="w-4 h-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Instagram</span>
            </a>

            {/* Email */}
            <a
              href={SOCIAL_LINKS.email}
              aria-label="Email Medrae"
              className="group flex items-center gap-2 h-9 px-3 rounded-xl border-0
                bg-slate-100 hover:bg-slate-200
                dark:bg-slate-800 dark:hover:bg-slate-700
                text-slate-600 dark:text-slate-300
                transition-colors active:scale-95"
            >
              <Mail className="w-4 h-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Email</span>
            </a>
          </div>
        </div>

        {/* ============================================ */}
        {/* TABS — borderless */}
        {/* ============================================ */}
        <div className="w-full">
          <Tabs defaultValue="all" className="space-y-3 md:space-y-4">
            <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex border-0 bg-slate-100 dark:bg-slate-800/50 h-11 rounded-xl p-1">
              <TabsTrigger
                value="all"
                className="text-xs md:text-sm font-normal rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                All ({announcements.length})
              </TabsTrigger>
              <TabsTrigger
                value="pinned"
                className="text-xs md:text-sm font-normal rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                Pinned ({pinnedAnnouncements.length})
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="text-xs md:text-sm font-normal rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
              >
                Unread ({unreadCount})
              </TabsTrigger>
            </TabsList>

            {/* All */}
            <TabsContent value="all" className="space-y-3 md:space-y-4 outline-none">
              {pinnedAnnouncements.length > 0 && (
                <div className="space-y-3 px-1 md:px-0">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Pin className="h-3.5 w-3.5" />
                    Pinned
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

              <div className="space-y-3 md:space-y-4">
                {pinnedAnnouncements.length > 0 && (
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 md:px-0 uppercase tracking-wider">
                    Recent
                  </h3>
                )}
                {regularAnnouncements.map((a) => (
                  <div key={a.id} className="px-1 md:px-0">
                    <AnnouncementCard
                      announcement={a}
                      markAsRead={markAsRead}
                      readAnnouncements={readAnnouncements}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                      getPriorityColor={getPriorityColor}
                      formatDate={formatDate}
                    />
                  </div>
                ))}
              </div>

              {announcements.length === 0 && (
                <div className="px-1 md:px-0">
                  <div className="rounded-2xl bg-white dark:bg-muted/30 p-10 text-center border-0">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-sm md:text-base font-medium text-slate-900 dark:text-white">
                      No announcements yet
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Updates and announcements from the Medrae team will appear here.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Pinned */}
            <TabsContent value="pinned" className="space-y-3 md:space-y-4 outline-none">
              {pinnedAnnouncements.length === 0 ? (
                <div className="px-1 md:px-0">
                  <div className="rounded-2xl bg-white dark:bg-muted/30 p-10 text-center border-0">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Pin className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-sm md:text-base font-medium text-slate-900 dark:text-white">
                      No pinned announcements
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Important announcements will be pinned here for quick access.
                    </p>
                  </div>
                </div>
              ) : (
                pinnedAnnouncements.map((a) => (
                  <div key={a.id} className="px-1 md:px-0">
                    <AnnouncementCard
                      announcement={a}
                      markAsRead={markAsRead}
                      readAnnouncements={readAnnouncements}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                      getPriorityColor={getPriorityColor}
                      formatDate={formatDate}
                    />
                  </div>
                ))
              )}
            </TabsContent>

            {/* Unread */}
            <TabsContent value="unread" className="space-y-3 md:space-y-4 outline-none">
              {announcements.filter((a) => !readAnnouncements.includes(a.id)).length === 0 ? (
                <div className="px-1 md:px-0">
                  <div className="rounded-2xl bg-white dark:bg-muted/30 p-10 text-center border-0">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-sm md:text-base font-medium text-slate-900 dark:text-white">
                      You're all caught up
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      You have no unread announcements.
                    </p>
                  </div>
                </div>
              ) : (
                announcements
                  .filter((a) => !readAnnouncements.includes(a.id))
                  .map((a) => (
                    <div key={a.id} className="px-1 md:px-0">
                      <AnnouncementCard
                        announcement={a}
                        markAsRead={markAsRead}
                        readAnnouncements={readAnnouncements}
                        getTypeIcon={getTypeIcon}
                        getTypeColor={getTypeColor}
                        getPriorityColor={getPriorityColor}
                        formatDate={formatDate}
                      />
                    </div>
                  ))
              )}
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
    <Card className="border-0 rounded-2xl shadow-none bg-white dark:bg-muted/30 overflow-hidden">
      <CardHeader className="px-1 py-4 pb-2">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              {announcement.pinned && (
                <Pin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              )}
              <CardTitle className="text-sm md:text-base font-medium text-slate-900 dark:text-white leading-snug">
                {announcement.title}
              </CardTitle>
              <div className={`h-1.5 w-1.5 rounded-full ${getPriorityColor(announcement.priority)} shrink-0`} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <Badge className={`${getTypeColor(announcement.type)} text-[10px] md:text-xs border-0 font-normal`}>
                {getTypeIcon(announcement.type)}
                <span className="ml-1 capitalize">{announcement.type}</span>
              </Badge>
              <Badge className="text-[10px] md:text-xs border-0 font-normal bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                {announcement.visible_to}
              </Badge>
            </div>
          </div>
          {isUnread && (
            <Button
              size="sm"
              onClick={() => markAsRead(announcement.id)}
              className="text-xs md:text-sm shrink-0 border-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-normal rounded-lg h-8 px-3"
            >
              Mark as Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-1 pb-4">
        <CardDescription className="text-sm md:text-[15px] mb-4 text-slate-600 dark:text-slate-300 leading-relaxed">
          {announcement.content}
        </CardDescription>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] md:text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Avatar className="h-5 w-5 md:h-6 md:w-6">
              <AvatarImage
                src={announcement.author_avatar || "/placeholder.svg"}
                className="object-cover"
              />
              <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[8px] md:text-[10px] font-medium">
                {announcement.author
                  ? announcement.author.split(" ").map((n: string) => n[0]).join("")
                  : "??"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[100px] md:max-w-none font-medium text-slate-600 dark:text-slate-400">
              {announcement.author || "Unknown"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <span>{formatDate(announcement.created_at)}</span>
            {announcement.expires_at && (
              <span className="text-orange-600 dark:text-orange-400">
                Expires {formatDate(announcement.expires_at)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}