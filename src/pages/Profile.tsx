import {
  User, Mail, Phone, MapPin, School, Calendar, Edit, Camera, Eye, EyeOff, Briefcase, Building2,
  Wifi, WifiOff, RefreshCw, ChevronLeft,
} from "lucide-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";
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

// ─────────────────────────────────────────────────────────────
// Safe localStorage helpers (Safari private mode can throw)
// ─────────────────────────────────────────────────────────────
const safeGetCachedProfile = (): any => {
  try {
    return JSON.parse(localStorage.getItem("userProfile") || "null");
  } catch {
    return null;
  }
};

const safeHasCachedProfile = (): boolean => {
  try {
    return !!localStorage.getItem("userProfile");
  } catch {
    return false;
  }
};

const safeSetItem = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
};

// ─────────────────────────────────────────────────────────────
// A profile is only "ready" when it has the minimum fields
// needed for the UI to be truthful. Anything less (e.g. a stray
// `{ role: "student" }` event, or a partial cache write) must be
// rejected — otherwise the shell renders with "No username yet"
// and every field as "Add your …", which is exactly the flash
// we're eliminating.
// ─────────────────────────────────────────────────────────────
const isProfileReady = (p: any): boolean =>
  !!p &&
  typeof p === "object" &&
  (!!p.user_id || !!p.id) &&
  (!!p.name || !!p.username);

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
  <div className="mx-auto w-full max-w-3xl px-2 sm:px-2 lg:px-8 py-4 md:py-6 pb-24 safe-bottom">
    <Tabs defaultValue="overview" className="space-y-2">
      <TabsList className="grid w-full grid-cols-3 h-10 md:h-11 text-xs md:text-sm rounded-xl border-0 shadow-none">
        <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
        <TabsTrigger value="stats" className="rounded-xl">Statistics</TabsTrigger>
        <TabsTrigger value="settings" className="rounded-xl">Account</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-2">
        {/* Profile Card Skeleton — mirrors real profile card */}
        {/* Profile Card Skeleton — mirrors the new centered layout */}
        <Card className="border-0 shadow-none rounded-2xl overflow-hidden bg-card">
          <Skeleton className="h-32 md:h-44 w-full rounded-none" />
          <div className="relative flex justify-center">
            <div className="absolute -top-12 md:-top-14">
              <Skeleton className="h-24 w-24 md:h-28 md:w-28 rounded-full" />
            </div>
          </div>
          <CardContent className="px-4 md:px-6 pt-16 md:pt-20 pb-4 md:pb-6">
            <div className="flex flex-col items-center text-center gap-2">
              <Skeleton className="h-7 w-40 md:h-8 md:w-48 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-lg" />
              <div className="flex gap-2 mt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-md mt-2 rounded-lg" />
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded-lg" />
                <Skeleton className="h-4 w-32 rounded-lg" />
                <Skeleton className="h-4 w-36 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-44 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded-lg" />
              </div>
            </div>
            <div className="mt-5 flex justify-center">
              <Skeleton className="h-9 md:h-10 w-40 md:w-48 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        {/* Academic Card Skeleton — mirrors real academic card */}
        <Card className="border-0 shadow-none rounded-xl">
          <CardHeader className="px-2 md:px-4 pt-2 md:pt-4 pb-2">
            <Skeleton className="h-5 w-48 md:h-6 md:w-56 rounded-xl" />
          </CardHeader>
          <CardContent className="space-y-2 px-2 md:px-4 pb-2 md:pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Skeleton className="h-3 w-16 mb-1 rounded-xl" />
                <Skeleton className="h-4 w-32 rounded-xl" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1 rounded-xl" />
                <Skeleton className="h-4 w-24 rounded-xl" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 mb-1 rounded-xl" />
                <Skeleton className="h-4 w-36 rounded-xl" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1 rounded-xl" />
                <Skeleton className="h-4 w-28 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Read the initial cache ONCE, synchronously, before first render.
// Only a *ready* profile is allowed to seed state — otherwise we
// start in a loading state and render the skeleton.
// ─────────────────────────────────────────────────────────────
const initialCacheRaw =
  typeof window !== "undefined" ? safeGetCachedProfile() : null;
const initialCache = isProfileReady(initialCacheRaw) ? initialCacheRaw : null;
// ─────────────────────────────────────────────────────────────
// Cover image resolver
// Rotates deterministically through /public backgrounds so each
// user gets a stable cover without any DB field.
// Swap/extend the array as you add more images to /public.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Cover image resolver
// Currently a single shared background for everyone.
// Add more paths to COVER_IMAGES later and the hash will
// distribute users automatically — no other code changes.
// ─────────────────────────────────────────────────────────────
const COVER_IMAGES = [
  "/background03.jpg",
];

const resolveCoverImage = (profile: any): string => {
  // 1. If the profile has an uploaded cover, honour it.
  if (profile?.cover_url) return profile.cover_url;

  // 2. Deterministic pick from the seed (safe with one item).
  const seed =
    profile?.user_id ||
    profile?.id ||
    profile?.username ||
    profile?.email ||
    "default";

  let hash = 0;
  for (let i = 0; i < String(seed).length; i++) {
    hash = (hash * 31 + String(seed).charCodeAt(i)) >>> 0;
  }
  return COVER_IMAGES[hash % COVER_IMAGES.length];
};
export function Profile() {
  const [profileState, setProfileState] = useState<any>(initialCache);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(!!initialCache);

  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const user = session?.user || null;
  const navigate = useNavigate();

  // 👇 full-screen chrome
  const home = useHomeRoute();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const handleBack = useCallback(() => {
    playSound("tap");
    if (navigator.vibrate) navigator.vibrate(20);
    navigate(home, { replace: true });
  }, [navigate, home]);

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

  // ─────────────────────────────────────────────────────────────
  // fetchProfile
  // ─────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user || isFetchingProfile.current) return;

    // 🔑 Wait for a real auth token. Otherwise Supabase may return
    //    `{ data: null, error: null }` because RLS rejected the
    //    request (stale/no JWT), which we'd misread as "user has
    //    no profile row" and flash the wrong empty state.
    if (!session?.access_token) return;

    // ── Offline guard ────────────────────────────────────────
    const offlineNow =
      typeof navigator !== "undefined" && navigator.onLine === false;

    if (offlineNow) {
      const fallback = profileState || safeGetCachedProfile();
      if (isProfileReady(fallback) && isMounted.current) {
        setProfileState((prev: any) => prev ?? fallback);
        setIsLoading(false);
      }
      if (isMounted.current) setHasLoadedOnce(true);
      return;
    }

    const now = Date.now();
    const cacheKey = `profile_${user.id}`;

    // ── In-memory cache hit ──────────────────────────────────
    if (profileCache.has(cacheKey)) {
      const cached = profileCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
        if (isProfileReady(cached.data)) {
          setProfileState(cached.data);
          setIsLoading(false);
          setHasLoadedOnce(true);
          return;
        }
        // partial → fall through and refetch
      }
    }

    // ── localStorage cache hit ───────────────────────────────
    const cachedProfile = safeGetCachedProfile();
    if (
      isProfileReady(cachedProfile) &&
      now - (cachedProfile._timestamp || 0) < CACHE_DURATION
    ) {
      if (isMounted.current) {
        setProfileState(cachedProfile);
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
      if (cachedProfile.role) {
        safeSetItem(`userRole_${user.id}`, cachedProfile.role);
        safeSetItem("last_known_role", cachedProfile.role);
      }
      profileCache.set(cacheKey, { data: cachedProfile, timestamp: now });
      return;
    }

    // ── Network fetch ────────────────────────────────────────
    // Only show the skeleton if we have nothing usable on screen.
    // A stale-but-usable cache stays rendered while we refresh.
    const usableCached = isProfileReady(cachedProfile) ? cachedProfile : null;
    const hasSomethingToShow = isProfileReady(profileState) || !!usableCached;
    if (usableCached && isMounted.current) {
      setProfileState(usableCached);
    }
    if (!hasSomethingToShow && isMounted.current) {
      setIsLoading(true);
    }

    isFetchingProfile.current = true;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && isProfileReady(data) && isMounted.current) {
        const profileWithTimestamp = { ...data, _timestamp: now };
        setProfileState(profileWithTimestamp);
        setIsLoading(false);
        setHasLoadedOnce(true);

        safeSetItem("userProfile", JSON.stringify(profileWithTimestamp));
        if (data.role) {
          safeSetItem(`userRole_${user.id}`, data.role);
          safeSetItem("last_known_role", data.role);
        }

        profileCache.set(cacheKey, {
          data: profileWithTimestamp,
          timestamp: now,
        });
        setTimeout(() => {
          if (profileCache.has(cacheKey)) profileCache.delete(cacheKey);
        }, 600000);
      } else if (isMounted.current) {
        // Genuine empty row (or a partial response we refuse to use).
        // Mark loaded so we stop showing the skeleton, but only after
        // a real token-authenticated attempt.
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      if (isMounted.current) {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    } finally {
      isFetchingProfile.current = false;
    }
  }, [user, profileState, session?.access_token]);

  // ─────────────────────────────────────────────────────────────
  // fetchSubscription
  // ─────────────────────────────────────────────────────────────
  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    if (!session?.access_token) return;

    const offlineNow =
      typeof navigator !== "undefined" && navigator.onLine === false;
    if (offlineNow) {
      if (activePlan === null) {
        const cacheKey = `subscription_${user.id}`;
        if (subscriptionCache.has(cacheKey)) {
          const cached = subscriptionCache.get(cacheKey);
          if (isMounted.current) {
            setActivePlan(cached.data?.plan_type || null);
          }
        }
      }
      return;
    }

    const now = Date.now();
    const cacheKey = `subscription_${user.id}`;

    if (subscriptionCache.has(cacheKey)) {
      const cached = subscriptionCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
        setActivePlan(cached.data?.plan_type || null);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, is_active, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (isMounted.current) {
        const plan = data?.is_active ? data.plan_type : null;
        setActivePlan(plan);
        subscriptionCache.set(cacheKey, { data, timestamp: now });
        setTimeout(() => {
          if (subscriptionCache.has(cacheKey)) subscriptionCache.delete(cacheKey);
        }, 600000);
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      // Don't clear activePlan on error — keep showing the last known plan
    }
  }, [user, activePlan, session?.access_token]);

  // ─────────────────────────────────────────────────────────────
  // Stable callback refs — effects use these so they don't
  // re-fire whenever the callbacks are recreated.
  // ─────────────────────────────────────────────────────────────
  const fetchProfileRef = useRef(fetchProfile);
  const fetchSubscriptionRef = useRef(fetchSubscription);
  useEffect(() => { fetchProfileRef.current = fetchProfile; }, [fetchProfile]);
  useEffect(() => { fetchSubscriptionRef.current = fetchSubscription; }, [fetchSubscription]);

  // ── Mount + user + auth-token hydration ──
  useEffect(() => {
    isMounted.current = true;
    if (user && session?.access_token) {
      fetchProfileRef.current();
      fetchSubscriptionRef.current();
    }
    return () => { isMounted.current = false; };
  }, [user?.id, session?.access_token]);

  // ── Back online ──
  useEffect(() => {
    const handleOnline = () => {
      if (user && isMounted.current) {
        fetchProfileRef.current();
        fetchSubscriptionRef.current();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user?.id]);

  // ── Window focus (throttled) ──
  useEffect(() => {
    let focusTimer: NodeJS.Timeout;
    let lastFocusRefresh = 0;
    const handleFocus = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFocusRefresh < 30000) return;
        lastFocusRefresh = now;
        if (user && isMounted.current) {
          fetchProfileRef.current();
          fetchSubscriptionRef.current();
        }
      }, 500);
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [user?.id]);

  // ── Cross-tab storage sync ──
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userProfile" && user && isMounted.current) {
        fetchProfileRef.current();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.id]);

  // ── profileUpdated custom event ──
  useEffect(() => {
    const handleProfileUpdated = (event: CustomEvent) => {
      if (user && isMounted.current) {
        // 🛡️ Reject partial events — they'd blank out good fields.
        if (!isProfileReady(event.detail)) {
          console.warn("[Profile] Ignored partial profileUpdated event:", event.detail);
          return;
        }
        setProfileState(event.detail);
        setIsLoading(false);
        setHasLoadedOnce(true);
        if (event.detail.role) {
          safeSetItem(`userRole_${user.id}`, event.detail.role);
          safeSetItem("last_known_role", event.detail.role);
        }
      }
    };
    window.addEventListener("profileUpdated", handleProfileUpdated as EventListener);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdated as EventListener);
  }, [user?.id]);

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
  const hasCachedProfile = safeHasCachedProfile();

  useEffect(() => {
    if (!sessionLoading && !user && !isOffline && isMounted.current) {
      navigate("/login", { replace: true });
    }
  }, [user, sessionLoading, isOffline, navigate]);

  // ─────────────────────────────────────────────────────────────
  // RENDER GATES
  // ─────────────────────────────────────────────────────────────

  if (isOffline && !isProfileReady(profileState) && !hasCachedProfile) {
    return (
      <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
        {/* Sticky top bar with back arrow */}
        <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
            border-b border-gray-100 dark:border-gray-800
            bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
            z-30 safe-top">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex items-center justify-center h-10 w-10 rounded-full
                bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                active:scale-95 transition-all touch-manipulation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
              Profile
            </h1>
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
              You're offline
            </p>
          </div>
        </header>

        {/* Internally-scrolling content */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
            custom-scrollbar overscroll-contain safe-bottom">
          <div className="min-h-full flex items-center justify-center px-4 py-8">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white/70 p-6 md:p-8 text-center shadow-sm backdrop-blur dark:bg-muted/30">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-slate-100 dark:bg-slate-800" />
              <div className="absolute bottom-0 left-0 h-16 w-16 rounded-tr-full bg-slate-100 dark:bg-slate-800" />

              <div className="relative flex flex-col items-center">
                <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl mb-4 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <WifiOff className="h-6 w-6 md:h-7 md:w-7" />
                </div>

                <h2 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">
                  You're offline
                </h2>

                <p className="mt-2 max-w-sm text-xs md:text-sm leading-6 text-slate-500 dark:text-slate-400">
                  We can't load your profile without a connection, and there's
                  nothing cached on this device yet. Reconnect to the internet and
                  your details will appear here automatically.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] md:text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <WifiOff className="h-3 w-3" />
                  No connection
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => {
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
                    Check connection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Skeleton — the ONE gate that matters.
  //    Until we have a *ready* profile, show the skeleton.
  //    This kills the "No username yet / Add your phone" flash
  //    entirely: nothing partial ever reaches the profile shell.
  if (!isProfileReady(profileState)) {
    return (
      <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
        {/* Sticky top bar with back arrow */}
        <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
            border-b border-gray-100 dark:border-gray-800
            bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
            z-30 safe-top">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex items-center justify-center h-10 w-10 rounded-full
                bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                active:scale-95 transition-all touch-manipulation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
              Profile
            </h1>
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {hasLoadedOnce && !isLoading && user && !isOffline
                ? "Complete your profile to continue"
                : "Loading your profile…"}
            </p>
          </div>
        </header>

        {/* Internally-scrolling content */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
            custom-scrollbar overscroll-contain safe-bottom">
          {hasLoadedOnce && !isLoading && user && !isOffline ? (
            <div className="min-h-full flex items-center justify-center px-4 py-8">
              <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white/70 p-6 md:p-8 text-center shadow-sm backdrop-blur dark:bg-muted/30">
                <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-slate-100 dark:bg-slate-800" />
                <div className="absolute bottom-0 left-0 h-16 w-16 rounded-tr-full bg-slate-100 dark:bg-slate-800" />

                <div className="relative flex flex-col items-center">
                  <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl mb-4 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <User className="h-6 w-6 md:h-7 md:w-7" />
                  </div>

                  <h2 className="text-lg md:text-xl font-bold text-slate-950 dark:text-white">
                    Profile not set up yet
                  </h2>

                  <p className="mt-2 max-w-sm text-xs md:text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Head to Settings to complete your profile and unlock the full
                    experience.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] md:text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Wifi className="h-3 w-3" />
                    Online
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => navigate("/settings")}
                      className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                      Complete Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ProfileSkeleton />
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // FULL PROFILE
  // ─────────────────────────────────────────────────────────────
  const displayName = profileState?.name?.trim() || profileState?.username || "Your Profile";
  const initials = profileState?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "ME";

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Sticky top bar with back arrow */}
      <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
          border-b border-gray-100 dark:border-gray-800
          bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
          z-30 safe-top">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center h-10 w-10 rounded-full
              bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
              active:scale-95 transition-all touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
            Profile
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
            Your account and statistics
          </p>
        </div>
      </header>

      {/* Internally-scrolling content */}
      <div
        ref={contentRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
            custom-scrollbar overscroll-contain"
      >
        <div className="mx-auto w-full max-w-3xl px-2 sm:px-2 lg:px-8 py-4 md:py-6 pb-24 safe-bottom">
          <Tabs defaultValue="overview" className="space-y-2">

            <TabsList className="grid w-full grid-cols-3 h-10 md:h-11 text-xs md:text-sm rounded-xl border-0 shadow-none">
              <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
              <TabsTrigger value="stats" className="rounded-xl">Statistics</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-2">
              {/* Profile Card */}
              {/* ── Profile Card — Facebook-style centered layout ── */}
              <Card className="border-0 shadow-none rounded-2xl overflow-hidden bg-card">
                {/* Cover photo */}
                {/* Cover photo — shared /background03.jpg for all users */}
                <div className="relative h-32 md:h-44 w-full overflow-hidden bg-muted">
                  <img
                    src={resolveCoverImage(profileState)}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      el.parentElement?.classList.add("cover-fallback");
                    }}
                  />
                  {/* Dark scrim for legibility */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/40" />
                  {/* Soft fade into the card body */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
                </div>
                {/* Avatar — half-overlapping the cover, centered */}
                <div className="relative flex justify-center">
                  <div className="absolute -top-12 md:-top-14">
                    <div className="relative">
                      <Avatar className="h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-card">
                        <AvatarImage
                          src={profileState?.avatar_url || undefined}
                          className="object-cover rounded-full"
                          loading="lazy"
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-2xl md:text-3xl font-semibold rounded-full">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        variant="outline"
                        className="absolute bottom-0 left-0 h-8 w-8 md:h-9 md:w-9 rounded-full shadow-none border-0 bg-background hover:bg-muted"
                        onClick={handleAvatarUpdate}
                        aria-label="Change profile photo"
                      >
                        <Camera className="h-4 w-4 md:h-4.5 md:w-4.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <CardContent className="px-4 md:px-6 pt-16 md:pt-20 pb-4 md:pb-6">
                  {/* Name + username — centered */}
                  <div className="flex flex-col items-center text-center gap-1">
                    <h2 className="text-xl md:text-2xl font-bold truncate max-w-full">
                      {displayName}
                    </h2>
                    {profileState?.username ? (
                      <p className="text-muted-foreground text-sm truncate max-w-full">
                        @{profileState.username}
                      </p>
                    ) : (
                      <p className="text-muted-foreground/60 italic text-xs md:text-sm">
                        No username yet
                      </p>
                    )}

                    {/* Badges — centered row */}
                    <div className="flex gap-2 flex-wrap justify-center mt-2">
                      {profileState?.role && (
                        <Badge variant="secondary" className="capitalize text-[10px] md:text-xs border-0 rounded-full px-2.5">
                          {profileState.role}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] md:text-xs border-0 bg-muted rounded-full px-2.5">
                        {activePlan || "Free"}
                      </Badge>
                    </div>

                    {/* Bio — centered, max width */}
                    {profileState?.bio?.trim() ? (
                      <p className="text-muted-foreground text-xs md:text-sm max-w-lg mt-2 leading-relaxed">
                        {profileState.bio}
                      </p>
                    ) : (
                      <p className="text-muted-foreground/60 italic text-xs md:text-sm mt-2">
                        No bio yet — add one from Settings to personalize your profile.
                      </p>
                    )}
                  </div>

                  {/* Info grid — centered card body */}
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
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

                  {/* Edit button — centered */}
                  <div className="mt-5 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleProfileUpdate}
                      className="text-xs md:text-sm h-9 md:h-10 border-0 shadow-none bg-muted hover:bg-muted/80 rounded-xl"
                    >
                      <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> Edit My Profile
                    </Button>
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
                      streakDays={profileState?.streak_days}
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
      </div>
    </div>
  );
}