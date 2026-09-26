import {
  User, Mail, Phone, MapPin, School, Calendar, Edit, Camera, Eye, EyeOff, Briefcase, Building2,
  Wifi, WifiOff, RefreshCw
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Avatar, AvatarFallback, AvatarImage
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, useSupabaseClient, useSessionContext } from "@supabase/auth-helpers-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoutDialog } from "@/components/LogoutDialog";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

// Cache helpers
const profileCache = new Map();
const subscriptionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// ---------------------------------------------------------
// Small reusable helper for empty values
// ---------------------------------------------------------

const EmptyValue = ({ label }: { label?: string }) => (
  <span className="text-muted-foreground/60 italic text-xs md:text-sm">
    {label ? `Add your ${label}` : "—"}
  </span>
);

const InfoRow = ({
  icon: Icon,
  value,
  fallback,
}: {
  icon: any;
  value?: string | null;
  fallback?: string;
}) => {
  const hasValue = value && value.trim() !== "" && value !== "Not set";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
      {hasValue ? (
        <span className="text-xs md:text-sm truncate">{value}</span>
      ) : (
        <EmptyValue label={fallback} />
      )}
    </div>
  );
};

// Skeleton Components
const ProfileSkeleton = () => (
  <div className="space-y-2 px-2 py-2 border-0 md:max-w-full mx-auto w-full pb-20 md:pb-6">
    <Tabs defaultValue="overview" className="space-y-2">
      <TabsList className="grid w-full grid-cols-3 h-10 md:h-11 text-xs md:text-sm rounded-xl border-0 shadow-none">
        <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
        <TabsTrigger value="stats" className="rounded-xl">Statistics</TabsTrigger>
        <TabsTrigger value="settings" className="rounded-xl">Account</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-2">
        {/* Profile Card Skeleton */}
        <Card className="border-0 shadow-none rounded-xl">
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 mb-2 md:mb-4">
              <Skeleton className="h-5 w-5 md:h-6 md:w-6 rounded-xl" />
              <Skeleton className="h-6 w-32 md:h-8 md:w-40 rounded-xl" />
            </div>
            <div className="flex flex-col md:flex-row items-start gap-2 md:gap-4">
              <div className="relative flex-shrink-0">
                <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-xl" />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40 md:h-8 md:w-48 rounded-xl" />
                    <Skeleton className="h-4 w-24 rounded-xl" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-xl" />
                    <Skeleton className="h-5 w-12 rounded-xl" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full max-w-md rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded-xl" />
                    <Skeleton className="h-4 w-32 rounded-xl" />
                    <Skeleton className="h-4 w-36 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-44 rounded-xl" />
                    <Skeleton className="h-4 w-28 rounded-xl" />
                  </div>
                </div>
                <Skeleton className="h-9 w-40 md:h-10 md:w-48 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Card Skeleton */}
        <Card className="border-0 shadow-none rounded-xl">
          <CardHeader className="px-2 md:px-4 pt-2 md:pt-4 pb-2">
            <Skeleton className="h-5 w-48 md:h-6 md:w-56 rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-2 px-2 md:px-4 pb-2 md:pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><Skeleton className="h-4 w-16 mb-1 rounded-xl" /><Skeleton className="h-4 w-32 rounded-xl" /></div>
              <div><Skeleton className="h-4 w-20 mb-1 rounded-xl" /><Skeleton className="h-4 w-24 rounded-xl" /></div>
              <div><Skeleton className="h-4 w-24 mb-1 rounded-xl" /><Skeleton className="h-4 w-36 rounded-xl" /></div>
              <div><Skeleton className="h-4 w-20 mb-1 rounded-xl" /><Skeleton className="h-4 w-28 rounded-xl" /></div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

export function Profile() {
  const getCachedProfile = () => {
    try { return JSON.parse(localStorage.getItem("userProfile") || "null"); }
    catch { return null; }
  };

  const [profileState, setProfileState] = useState(getCachedProfile());
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!getCachedProfile());
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const user = session?.user || null;
  const navigate = useNavigate();

  const [showDialog, setShowDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMounted = useRef(true);
  const isFetchingProfile = useRef(false);
  const lastProfileFetch = useRef(0);

  const handleLogout = useCallback(async () => {
    try {
      if (user) {
        const deviceId = localStorage.getItem("device_id");

        // ✅ Only delete THIS device's session row
        if (deviceId) {
          await supabase
            .from("user_sessions")
            .delete()
            .eq("user_id", user.id)
            .eq("device_id", deviceId);
        }

        // Sign out this device's auth session only
        await supabase.auth.signOut({ scope: "local" });

        // ✅ Remove only auth-related keys — keep device_id
        localStorage.removeItem("supabaseUser");
        localStorage.removeItem("supabaseUserTokens");
        localStorage.removeItem("medrae_auth");
        localStorage.removeItem(`userRole_${user.id}`);
        localStorage.removeItem("last_known_role");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("app_user_profile_cache");
        sessionStorage.clear();
        // device_id intentionally kept

        if (isMounted.current) {
          setProfileState(null);
          setActivePlan(null);
        }

        navigate("/", { replace: true });
        toast({ title: "Logged out", description: "You have been logged out on this device." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    }
  }, [user, navigate]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return; setDeleting(true);
    try {
      const sessionData = session;
      if (!sessionData?.access_token) { toast({ title: "Error", description: "No active session found." }); return; }
      const deviceId = localStorage.getItem("device_id");
      await supabase.from("user_sessions").delete()
        .eq("user_id", user.id)
        .eq("device_id", deviceId);
      await supabase.from("profiles").update({ active_session_id: null }).eq("user_id", user.id);
      const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/delete-user", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.access_token}` },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error || "Something went wrong." }); return; }
      toast({ title: "Deleted", description: "Your account has been permanently deleted." });
      setShowDeleteDialog(false); localStorage.removeItem("supabaseUser");
      localStorage.removeItem("supabaseUserTokens");
      localStorage.removeItem("medrae_auth");
      localStorage.removeItem(`userRole_${user.id}`);
      localStorage.removeItem("last_known_role");
      localStorage.removeItem("userProfile");
      sessionStorage.clear();
      // Keep device_id — it must persist
      if (isMounted.current) { setProfileState(null); setActivePlan(null); }
      await supabase.auth.signOut(); navigate("/", { replace: true });
    } catch (err: any) { toast({ title: "Error", description: err.message }); }
    finally { setDeleting(false); }
  }, [user, session, navigate]);

  const handleProfileUpdate = useCallback(() => { navigate("/settings"); }, [navigate]);
  const handleAvatarUpdate = useCallback(() => { toast({ title: "Redirect to Settings", description: "Please update your photo in the Settings page." }); }, []);

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) { toast({ title: "Weak Password", description: "Password must be at least 6 characters." }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Mismatch", description: "Passwords do not match." }); return; }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) { toast({ title: "Error", description: error.message }); }
    else { toast({ title: "Success", description: "Password updated successfully." }); setNewPassword(""); setConfirmPassword(""); setShowDialog(false); }
  }, [newPassword, confirmPassword]);

  const fetchProfile = useCallback(async () => {
    if (!user || isFetchingProfile.current) return;
    const now = Date.now(); const cacheKey = `profile_${user.id}`;
    if (profileCache.has(cacheKey)) {
      const cached = profileCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
        setProfileState(cached.data);
        setIsLoading(false);
        return;
      }
    }
    const cachedProfile = getCachedProfile();
    if (cachedProfile && now - (cachedProfile._timestamp || 0) < CACHE_DURATION) {
      setProfileState(cachedProfile);
      setIsLoading(false);
      if (cachedProfile.role) { localStorage.setItem(`userRole_${user.id}`, cachedProfile.role); localStorage.setItem("last_known_role", cachedProfile.role); }
      profileCache.set(cacheKey, { data: cachedProfile, timestamp: now }); return;
    }
    isFetchingProfile.current = true;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (data && isMounted.current) {
        const profileWithTimestamp = { ...data, _timestamp: now };
        setProfileState(profileWithTimestamp);
        setIsLoading(false);
        localStorage.setItem("userProfile", JSON.stringify(profileWithTimestamp));
        if (data.role) { localStorage.setItem(`userRole_${user.id}`, data.role); localStorage.setItem("last_known_role", data.role); }
        profileCache.set(cacheKey, { data: profileWithTimestamp, timestamp: now });
        setTimeout(() => { if (profileCache.has(cacheKey)) profileCache.delete(cacheKey); }, 600000);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setIsLoading(false);
    }
    finally { isFetchingProfile.current = false; }
  }, [user]);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const now = Date.now(); const cacheKey = `subscription_${user.id}`;
    if (subscriptionCache.has(cacheKey)) { const cached = subscriptionCache.get(cacheKey); if (now - cached.timestamp < CACHE_DURATION && isMounted.current) { setActivePlan(cached.data?.plan_type || null); return; } }
    try {
      const { data, error } = await supabase.from("subscriptions").select("plan_type, is_active, expires_at").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (isMounted.current) { const plan = data?.is_active ? data.plan_type : null; setActivePlan(plan); subscriptionCache.set(cacheKey, { data, timestamp: now }); setTimeout(() => { if (subscriptionCache.has(cacheKey)) subscriptionCache.delete(cacheKey); }, 600000); }
    } catch (err) { console.error("Failed to fetch subscription:", err); }
  }, [user]);

  useEffect(() => { isMounted.current = true; if (user) { fetchProfile(); fetchSubscription(); } return () => { isMounted.current = false; }; }, [user, fetchProfile, fetchSubscription]);
  // Auto-retry when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      if (user && isMounted.current) {
        fetchProfile();
        fetchSubscription();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user, fetchProfile, fetchSubscription]);
  useEffect(() => {
    let focusTimer: NodeJS.Timeout; let lastFocusRefresh = 0;
    const handleFocus = () => { if (focusTimer) clearTimeout(focusTimer); focusTimer = setTimeout(() => { const now = Date.now(); if (now - lastFocusRefresh < 30000) return; lastFocusRefresh = now; if (user && isMounted.current) { fetchProfile(); fetchSubscription(); } }, 500); };
    window.addEventListener('focus', handleFocus);
    return () => { window.removeEventListener('focus', handleFocus); if (focusTimer) clearTimeout(focusTimer); };
  }, [user, fetchProfile, fetchSubscription]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => { if (e.key === 'userProfile' && user && isMounted.current) fetchProfile(); };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, fetchProfile]);

  useEffect(() => {
    const handleProfileUpdated = (event: CustomEvent) => { if (user && isMounted.current) { setProfileState(event.detail); setIsLoading(false); if (event.detail.role) { localStorage.setItem(`userRole_${user.id}`, event.detail.role); localStorage.setItem("last_known_role", event.detail.role); } } };
    window.addEventListener('profileUpdated', handleProfileUpdated as EventListener);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated as EventListener);
  }, [user]);

  const getDaysMessage = useCallback(() => {
    if (!profileState?.joined_date) return "No join date available.";
    const joinDate = new Date(profileState.joined_date); const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime()); const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    if (years === 0) return `You are ${days} day${days !== 1 ? "s" : ""} old on the platform. Keep going strong!`;
    const nextAnniversary = years + 1;
    return `You are ${years} year${years > 1 ? "s" : ""} old on the platform. Waiting to celebrate your ${nextAnniversary}${getOrdinalSuffix(nextAnniversary)} anniversary!`;
  }, [profileState?.joined_date]);

  const getOrdinalSuffix = (i: number) => { const j = i % 10, k = i % 100; if (j === 1 && k !== 11) return "st"; if (j === 2 && k !== 12) return "nd"; if (j === 3 && k !== 13) return "rd"; return "th"; };

  const { isLoading: sessionLoading } = useSessionContext();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  useEffect(() => { if (!sessionLoading && !user && !isOffline && isMounted.current) navigate("/login", { replace: true }); }, [user, sessionLoading, isOffline, navigate]);

  if (isLoading || (sessionLoading && !profileState)) {
    return <ProfileSkeleton />;
  }

  if (!profileState) {
    // Determine which empty state to show
    const hasCachedProfile = !!localStorage.getItem("userProfile");
    const isNetworkIssue = isOffline || (!hasCachedProfile && user);

    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white/70 p-6 md:p-8 text-center shadow-sm backdrop-blur dark:bg-muted/30">

          {/* Decorative corner accents — same family as other cards */}
          <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-slate-100 dark:bg-slate-800" />
          <div className="absolute bottom-0 left-0 h-16 w-16 rounded-tr-full bg-slate-100 dark:bg-slate-800" />

          <div className="relative flex flex-col items-center">
            {/* Icon badge — offline vs online */}
            <div
              className={`flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl mb-4 ${isOffline
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
            >
              {isOffline ? (
                <WifiOff className="h-6 w-6 md:h-7 md:w-7" />
              ) : (
                <User className="h-6 w-6 md:h-7 md:w-7" />
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">
              {isOffline
                ? "You're offline"
                : hasCachedProfile
                  ? "Couldn't load your profile"
                  : "Profile not set up yet"}
            </h2>

            {/* Subtitle */}
            <p className="mt-2 max-w-sm text-xs md:text-sm leading-6 text-slate-500 dark:text-slate-400">
              {isOffline
                ? "Your profile data isn't cached on this device yet. Reconnect to the internet to load it."
                : hasCachedProfile
                  ? "We couldn't reach the server. Check your connection and try again."
                  : "Head to Settings to complete your profile and unlock the full experience."}
            </p>

            {/* Status pill */}
            <div
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] md:text-xs font-bold ${isOffline
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="h-3 w-3" />
                  No connection
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3" />
                  Online
                </>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isOffline ? (
                <Button
                  onClick={() => {
                    // Just re-check online status — the online event listener will refetch
                    if (navigator.onLine) {
                      fetchProfile();
                      fetchSubscription();
                    } else {
                      toast({
                        title: "Still offline",
                        description: "Reconnect to the internet and try again.",
                      });
                    }
                  }}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                  Retry
                </Button>
              ) : hasCachedProfile ? (
                <Button
                  onClick={() => {
                    fetchProfile();
                    fetchSubscription();
                  }}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                  Try again
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/settings")}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                  Complete Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profileState?.name?.trim() || profileState?.username || "Your Profile";
  const initials = profileState?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "ME";

  return (
    <div className="space-y-2 px-2 py-2 border-0 md:max-w-full mx-auto w-full pb-20 md:pb-6">
      <Tabs defaultValue="overview" className="space-y-2">
        <TabsList className="grid w-full grid-cols-3 h-10 md:h-11 text-xs md:text-sm rounded-xl border-0 shadow-none">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl">Statistics</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2">
          {/* Profile Card */}
          <Card className="border-0 shadow-none rounded-xl">
            <CardContent className="p-2 md:p-4">
              <div className="flex items-center gap-2 mb-2 md:mb-4">
                <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <h1 className="text-xl md:text-2xl font-bold">My Profile</h1>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-2 md:gap-4">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24 rounded-xl">
                    <AvatarImage src={profileState?.avatar_url || undefined} className="object-cover rounded-xl" loading="lazy" />
                    <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-xl md:text-2xl font-semibold rounded-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="outline" className="absolute -bottom-2 -right-2 h-7 w-7 md:h-8 md:w-8 rounded-xl shadow-none border-0" onClick={handleAvatarUpdate}>
                    <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold">{displayName}</h2>
                      {profileState?.username ? (
                        <p className="text-muted-foreground text-sm">@{profileState.username}</p>
                      ) : (
                        <p className="text-muted-foreground/60 italic text-xs md:text-sm">
                          No username yet
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {profileState?.role && (
                        <Badge variant="secondary" className="capitalize text-[10px] md:text-xs border-0 rounded-xl">
                          {profileState.role}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] md:text-xs border-0 bg-muted rounded-xl">
                        {activePlan || "Free"}
                      </Badge>
                    </div>
                  </div>

                  {profileState?.bio?.trim() ? (
                    <p className="text-muted-foreground text-xs md:text-sm">{profileState.bio}</p>
                  ) : (
                    <p className="text-muted-foreground/60 italic text-xs md:text-sm">
                      No bio yet — add one from Settings to personalize your profile.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <InfoRow icon={Mail} value={profileState?.email} fallback="email" />
                      <InfoRow icon={Phone} value={profileState?.phone} fallback="phone number" />
                      <InfoRow icon={MapPin} value={profileState?.county} fallback="county" />
                    </div>
                    <div className="space-y-2">
                      <InfoRow icon={School} value={profileState?.institution} fallback="institution" />
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                        {profileState?.joined_date ? (
                          <span className="text-xs md:text-sm">
                            Joined {new Date(profileState.joined_date).toLocaleDateString(undefined, {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                        ) : (
                          <EmptyValue />
                        )}
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" onClick={handleProfileUpdate} className="text-xs md:text-sm h-9 md:h-10 w-full md:w-auto border-0 shadow-none bg-muted hover:bg-muted/80 rounded-xl">
                    <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> Edit My Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Card */}
          <Card className="border-0 shadow-none rounded-xl">
            <CardHeader className="px-2 md:px-4 pt-2 md:pt-4 pb-2">
              <CardTitle className="text-base md:text-lg">Academic & Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-2 md:px-4 pb-2 md:pb-4">
              {(() => {
                const items = [
                  profileState?.course && { label: "Course", value: profileState.course },
                  profileState?.block && { label: "Block/Class", value: profileState.block },
                  profileState?.nck_number && { label: "NCK / Exam Number", value: profileState.nck_number },
                  profileState?.specialization && { label: "Specialization", value: profileState.specialization },
                  profileState?.workplace && { label: "Workplace", value: profileState.workplace, icon: Building2 },
                  profileState?.employment_type && {
                    label: "Employment Type",
                    value: profileState.employment_type.replace("_", " "),
                    icon: Briefcase,
                    capitalize: true,
                  },
                  profileState?.years_experience !== undefined &&
                  profileState?.years_experience !== null && {
                    label: "Years of Experience",
                    value: `${profileState.years_experience} years`,
                  },
                  profileState?.license_status && {
                    label: "License Status",
                    value: profileState.license_status.replace("_", " "),
                    capitalize: true,
                  },
                ].filter(Boolean) as Array<{
                  label: string;
                  value: string;
                  icon?: any;
                  capitalize?: boolean;
                }>;

                if (items.length === 0) {
                  return (
                    <div className="text-center py-2 md:py-4">
                      <p className="text-muted-foreground/70 italic text-xs md:text-sm">
                        No academic or professional details added yet.
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleProfileUpdate}
                        className="mt-2 text-xs md:text-sm border-0 shadow-none bg-muted hover:bg-muted/80 rounded-xl"
                      >
                        <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> Add details
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((item) => (
                      <div key={item.label}>
                        <label className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
                          {item.icon && <item.icon className="h-2.5 w-2.5 md:h-3 md:w-3" />}
                          {item.label}
                        </label>
                        <p className={`font-medium text-xs md:text-sm ${item.capitalize ? "capitalize" : ""}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-2">
          <Card className="border-0 shadow-none rounded-xl">
            <CardHeader className="px-2 md:px-4 pt-2 md:pt-4 pb-2">
              <CardTitle className="text-base md:text-lg">Platform Statistics</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4 text-center">
              <p className="text-sm md:text-lg font-medium text-muted-foreground">{getDaysMessage()}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-2">
          <Card className="border-0 shadow-none rounded-xl">
            <CardHeader className="px-2 md:px-4 pt-2 md:pt-4 pb-2">
              <CardTitle className="text-base md:text-lg">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-2 md:px-4 pb-2 md:pb-4">
              <p className="text-muted-foreground text-xs md:text-sm">Update your account settings and preferences in the Settings page.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleProfileUpdate} className="text-xs md:text-sm h-9 md:h-10 border-0 shadow-none bg-muted hover:bg-muted/80 rounded-xl">
                  <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLogoutDialog(true)}
                  className="text-xs md:text-sm h-9 md:h-10 border-0 shadow-none bg-muted hover:bg-muted/80 rounded-xl"
                >
                  Logout
                </Button>

                <LogoutDialog
                  open={showLogoutDialog}
                  onOpenChange={setShowLogoutDialog}
                  onConfirm={handleLogout}
                  userName={profileState?.name || profileState?.username}
                  streakDays={profileState?.streak_days}  // optional — omit if not in profile
                />
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-xs md:text-sm h-9 md:h-10 border-0 shadow-none rounded-xl"
                >
                  Delete My Account
                </Button>

                <DeleteAccountDialog
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                  onConfirm={handleDeleteAccount}
                  userName={profileState?.name}
                  username={profileState?.username}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(true)}
                  className="text-xs md:text-sm h-9 md:h-10 border-0 shadow-none bg-muted hover:bg-muted/80 rounded-xl"
                >
                  Change Password
                </Button>

                <ChangePasswordDialog
                  open={showDialog}
                  onOpenChange={setShowDialog}
                  onSubmit={async (newPassword) => {
                    // Reuse your existing handler logic, but only for the actual submit.
                    // Your original handleChangePassword validates length + match — we've
                    // already done that in the dialog, so here we just call Supabase.
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) {
                      toast({ title: "Error", description: error.message });
                    } else {
                      toast({
                        title: "Password updated",
                        description: "Your new password is now active.",
                      });
                      setShowDialog(false);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}