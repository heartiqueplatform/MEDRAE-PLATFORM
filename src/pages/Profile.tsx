import {
  User, Mail, Phone, MapPin, School, Calendar, Edit, Camera, Eye, EyeOff, Briefcase, Building2
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
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
import { Skeleton } from "@/components/ui/skeleton";

// Cache helpers
const profileCache = new Map();
const subscriptionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// Skeleton Components
const ProfileSkeleton = () => (
  <div className="space-y-0 md:space-y-2 px-0 md:px-2 border-0 md:max-w-full md:px-4 lg:px-6 mx-auto w-full pb-20 md:pb-6">
    <Tabs defaultValue="overview" className="space-y-0 md:space-y-2">
      <TabsList className="grid w-full grid-cols-3 h-10 md:h-11 text-xs md:text-sm rounded-none md:rounded-xl mx-0 md:mx-0">
        <TabsTrigger value="overview" className="rounded-lg md:rounded-xl">Overview</TabsTrigger>
        <TabsTrigger value="stats" className="rounded-lg md:rounded-xl">Statistics</TabsTrigger>
        <TabsTrigger value="settings" className="rounded-lg md:rounded-xl">Account</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-0 md:space-y-2">
        {/* Profile Card Skeleton */}
        <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <Skeleton className="h-5 w-5 md:h-6 md:w-6 rounded" />
              <Skeleton className="h-6 w-32 md:h-8 md:w-40" />
            </div>
            <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
              <div className="relative flex-shrink-0">
                <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full" />
              </div>
              <div className="flex-1 space-y-3 md:space-y-4 w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40 md:h-8 md:w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex gap-1.5 md:gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  <div className="space-y-2 md:space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-9 w-40 md:h-10 md:w-48" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Card Skeleton */}
        <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
          <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
            <Skeleton className="h-5 w-48 md:h-6 md:w-56" />
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-4 w-32" /></div>
              <div><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-4 w-24" /></div>
              <div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-4 w-36" /></div>
              <div><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-4 w-28" /></div>
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
  const channelRef = useRef<any>(null);

  const handleLogout = useCallback(async () => {
    try {
      if (user) {
        await supabase.from("user_sessions").delete().eq("user_id", user.id);
        await supabase.from("profiles").update({ active_session_id: null }).eq("user_id", user.id);
        await supabase.auth.signOut();
        localStorage.removeItem(`userRole_${user.id}`);
        localStorage.removeItem("last_known_role");
        localStorage.clear(); sessionStorage.clear();
        if (isMounted.current) { setProfileState(null); setActivePlan(null); }
        navigate("/", { replace: true });
        toast({ title: "Logged out", description: "You have been logged out." });
      }
    } catch (err: any) { toast({ title: "Error", description: err.message }); }
  }, [user, navigate]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return; setDeleting(true);
    try {
      const sessionData = session;
      if (!sessionData?.access_token) { toast({ title: "Error", description: "No active session found." }); return; }
      await supabase.from("user_sessions").delete().eq("user_id", user.id);
      await supabase.from("profiles").update({ active_session_id: null }).eq("user_id", user.id);
      const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/delete-user", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.access_token}` },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error || "Something went wrong." }); return; }
      toast({ title: "Deleted", description: "Your account has been permanently deleted." });
      setShowDeleteDialog(false); localStorage.clear(); sessionStorage.clear();
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

  // Show skeleton while loading
  if (isLoading || (sessionLoading && !profileState)) {
    return <ProfileSkeleton />;
  }

  if (!profileState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full text-center p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold">Profile not found</h2>
        <p className="text-muted-foreground mb-3 md:mb-4 text-xs md:text-sm">We couldn't find your profile data.</p>
        {isOffline && <Badge variant="destructive" className="text-xs">Offline Mode</Badge>}
        <Button onClick={() => navigate("/login")} className="mt-3 md:mt-4 text-xs md:text-sm">Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-0 md:space-y-2 px-0 md:px-2 border-0 md:max-w-full md:px-4 lg:px-6 mx-auto w-full pb-20 md:pb-6">
      <Tabs defaultValue="overview" className="space-y-0 md:space-y-2">
        <TabsList className="grid w-full grid-cols-3 h-10 md:h-11 text-xs md:text-sm rounded-none md:rounded-xl mx-0 md:mx-0">
          <TabsTrigger value="overview" className="rounded-lg md:rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-lg md:rounded-xl">Statistics</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg md:rounded-xl">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-0 md:space-y-2">
          {/* Profile Card */}
          <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <h1 className="text-xl md:text-2xl font-bold">My Profile</h1>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24">
                    <AvatarImage src={profileState?.avatar_url || undefined} className="object-cover" loading="lazy" />
                    <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-xl md:text-2xl">
                      {profileState?.name?.split(" ").map((n: string) => n[0]).join("") || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="outline" className="absolute -bottom-2 -right-2 h-7 w-7 md:h-8 md:w-8 rounded-full" onClick={handleAvatarUpdate}>
                    <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-3 md:space-y-4 w-full">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold">{profileState?.name}</h2>
                      <p className="text-muted-foreground text-sm">@{profileState?.username}</p>
                    </div>
                    <div className="flex gap-1.5 md:gap-2">
                      <Badge variant="secondary" className="capitalize text-[10px] md:text-xs">{profileState?.role}</Badge>
                      <Badge variant="outline" className="text-[10px] md:text-xs">{activePlan || "Free"}</Badge>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-xs md:text-sm">{profileState?.bio || "No bio provided"}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center gap-1.5 md:gap-2"><Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /><span className="text-xs md:text-sm">{profileState?.email || "Not set"}</span></div>
                      <div className="flex items-center gap-1.5 md:gap-2"><Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /><span className="text-xs md:text-sm">{profileState?.phone || "Not set"}</span></div>
                      <div className="flex items-center gap-1.5 md:gap-2"><MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /><span className="text-xs md:text-sm">{profileState?.county || "Not set"}</span></div>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center gap-1.5 md:gap-2"><School className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /><span className="text-xs md:text-sm">{profileState?.institution || "Not set"}</span></div>
                      <div className="flex items-center gap-1.5 md:gap-2"><Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /><span className="text-xs md:text-sm">Joined {profileState?.joined_date ? new Date(profileState?.joined_date).toLocaleDateString() : "N/A"}</span></div>
                    </div>
                  </div>

                  <Button variant="outline" onClick={handleProfileUpdate} className="text-xs md:text-sm h-9 md:h-10 w-full md:w-auto">
                    <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Edit My Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Card */}
          <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <CardTitle className="text-base md:text-lg">Academic & Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground">Course</label><p className="font-medium text-xs md:text-sm">{profileState?.course || "Not set"}</p></div>
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground">Block/Class</label><p className="font-medium text-xs md:text-sm">{profileState?.block || "Not set"}</p></div>
                {profileState?.nck_number && <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground">NCK / Exam Number</label><p className="font-medium text-xs md:text-sm">{profileState?.nck_number}</p></div>}
                {profileState?.specialization && <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground">Specialization</label><p className="font-medium text-xs md:text-sm">{profileState?.specialization}</p></div>}
                {profileState?.workplace && <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1"><Building2 className="h-2.5 w-2.5 md:h-3 md:w-3" /> Workplace</label><p className="font-medium text-xs md:text-sm">{profileState?.workplace}</p></div>}
                {profileState?.employment_type && <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-2.5 w-2.5 md:h-3 md:w-3" /> Employment Type</label><p className="font-medium text-xs md:text-sm capitalize">{profileState?.employment_type?.replace("_", " ")}</p></div>}
                {profileState?.years_experience !== undefined && profileState?.years_experience !== null && <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground">Years of Experience</label><p className="font-medium text-xs md:text-sm">{profileState?.years_experience} years</p></div>}
                {profileState?.license_status && <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground">License Status</label><Badge variant={profileState?.license_status === "active" ? "default" : "secondary"} className="capitalize text-[10px] md:text-xs">{profileState?.license_status?.replace("_", " ")}</Badge></div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-0 md:space-y-6">
          <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <CardTitle className="text-base md:text-lg">Platform Statistics</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 text-center">
              <p className="text-sm md:text-lg font-medium text-muted-foreground">{getDaysMessage()}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-0 md:space-y-6">
          <Card className="md:border-0 rounded-none md:rounded-xl">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <CardTitle className="text-base md:text-lg">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
              <p className="text-muted-foreground text-xs md:text-sm">Update your account settings and preferences in the Settings page.</p>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <Button variant="outline" onClick={handleProfileUpdate} className="text-xs md:text-sm h-9 md:h-10"><Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Edit Profile</Button>
                <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                  <DialogTrigger asChild><Button variant="outline" className="text-xs md:text-sm h-9 md:h-10">Logout</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Confirm Logout</DialogTitle><DialogDescription>Are you sure you want to log out?</DialogDescription></DialogHeader><DialogFooter className="mt-4"><Button variant="secondary" onClick={() => setShowLogoutDialog(false)} className="text-xs md:text-sm">Cancel</Button><Button variant="destructive" onClick={handleLogout} className="text-xs md:text-sm">Logout</Button></DialogFooter></DialogContent>
                </Dialog>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild><Button variant="destructive" className="text-xs md:text-sm h-9 md:h-10">Delete My Account</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Confirm Delete</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter className="mt-4"><Button variant="secondary" onClick={() => setShowDeleteDialog(false)} className="text-xs md:text-sm">Cancel</Button><Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="text-xs md:text-sm">{deleting ? "Deleting..." : "Delete"}</Button></DialogFooter></DialogContent>
                </Dialog>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                  <DialogTrigger asChild><Button variant="outline" className="text-xs md:text-sm h-9 md:h-10">Change Password</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Change Password</DialogTitle><DialogDescription>Enter and confirm your new password.</DialogDescription></DialogHeader>
                    <div className="space-y-3 md:space-y-4 mt-2">
                      <div>
                        <Label htmlFor="newPassword" className="text-xs md:text-sm">New Password</Label>
                        <div className="relative">
                          <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="text-xs md:text-sm h-10 md:h-11" />
                          <button type="button" className="absolute inset-y-0 right-3 flex items-center text-muted-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />}</button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword" className="text-xs md:text-sm">Confirm Password</Label>
                        <div className="relative">
                          <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="text-xs md:text-sm h-10 md:h-11" />
                          <button type="button" className="absolute inset-y-0 right-3 flex items-center text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />}</button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-4"><Button onClick={handleChangePassword} disabled={passwordLoading} className="text-xs md:text-sm">{passwordLoading ? "Updating..." : "Update Password"}</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}