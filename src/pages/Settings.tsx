"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User, GraduationCap, Save, Trash2, AlertCircle, Search, X, ChevronLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RoleSwitch } from "@/components/settings/RoleSwitch";
import { useUserRole } from "@/context/UserRoleContext";
import { institutions, counties } from "@/components/forms/institutions.data";
import { useNavigate } from "react-router-dom";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";
// ─── Searchable Institution Picker (same UX as Register.tsx) ───
// ─── Searchable Institution Picker — uses shadcn Select (matches County picker) ───
function SearchableInstitutionPicker({
  value, onChange, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = institutions.find((i) => i.value === value);

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? institutions.filter(
        (i) =>
          i.label.toLowerCase().includes(term) ||
          i.value.toLowerCase().includes(term)
      )
      : institutions;

    const tags = [
      { tag: "kmtc", title: "KMTC Campuses", items: filtered.filter((i) => i.tag === "kmtc") },
      { tag: "university", title: "Universities", items: filtered.filter((i) => i.tag === "university") },
      { tag: "hospital", title: "Hospital / Mission / Nursing Colleges", items: filtered.filter((i) => i.tag === "hospital") },
      { tag: "other", title: "Other Colleges", items: filtered.filter((i) => i.tag === "other") },
    ];
    return tags.filter((t) => t.items.length > 0);
  }, [query]);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger
        className={`text-xs md:text-sm h-10 md:h-11 ${hasError ? "border-destructive" : ""}`}
      >
        <SelectValue placeholder="Search or choose institution">
          {selected?.label ?? ""}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="max-h-[340px] p-0">
        {/* Sticky search input — flush to top edge, zero gap */}
        <div className="sticky -top-2 z-10 bg-popover border-b border-border p-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search e.g. 'KMTC Nakuru'"
              className="w-full pl-9 pr-8 py-2.5 rounded-none bg-transparent border-0 text-xs md:text-sm outline-none focus:ring-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Grouped results */}
        <div className="py-1">
          {grouped.length === 0 ? (
            <div className="p-6 text-center text-xs md:text-sm text-muted-foreground">
              No institution matches "{query}"
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.tag}>
                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50">
                  {group.title} ({group.items.length})
                </div>
                {group.items.map((inst) => (
                  <SelectItem
                    key={inst.value}
                    value={inst.value}
                    className="text-xs md:text-sm"
                  >
                    {inst.label}
                  </SelectItem>
                ))}
              </div>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

// ─── County Picker (searchable + grouped by region) ───
function CountyPicker({
  value, onChange, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  // Counties are 47 items — no search needed, but scroll is fine.
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger
        className={`text-xs md:text-sm h-10 md:h-11 ${hasError ? "border-destructive" : ""}`}
      >
        <SelectValue placeholder="Choose county" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {counties.map((county) => (
          <SelectItem key={county.value} value={county.value}>
            {county.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Skeletons, FormFields, helpers (unchanged from your file) ───
function SettingsSkeleton() {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl space-y-3 md:space-y-4 animate-pulse">
        <Card className="w-full overflow-hidden p-1 md:p-2 rounded-none md:rounded-xl border-0 shadow-none">
          <div className="mt-1 md:mt-2">
            <div className="space-y-1 md:space-y-2">
              <div className="h-8 md:h-10 w-32 md:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 md:h-5 w-48 md:w-72 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex flex-col gap-0.5 md:gap-1">
                    <div className="h-5 md:h-6 w-32 md:w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 md:h-4 w-40 md:w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 md:h-4 w-32 md:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                <div className="grid gap-1 md:gap-2 md:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-4 md:h-5 w-32 md:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
        <div className="space-y-1 md:space-y-2">
          <div className="grid w-full grid-cols-2 h-10 md:h-11 gap-1">
            <div className="h-10 md:h-11 bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl" />
            <div className="h-10 md:h-11 bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl" />
          </div>
          <Card className="rounded-none md:rounded-xl border-0 shadow-none">
            <CardHeader className="px-1 md:px-2 pt-1 md:pt-2">
              <div className="h-6 md:h-7 w-48 md:w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 md:h-5 w-64 md:w-96 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-1 md:px-2 pb-1 md:pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex flex-col gap-1 md:gap-2 w-full sm:w-auto">
                  <div className="h-9 md:h-10 w-full sm:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-8 md:h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 md:h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2 md:space-y-3">
                <div className="h-5 md:h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1 md:space-y-2">
                    <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-10 md:h-11 w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const FormField = ({
  label, id, value, onChange, onBlur, showError, required, type = "text", placeholder,
}: any) => {
  return (
    <div className="space-y-1.5 md:space-y-2">
      <Label htmlFor={id} className={`text-xs md:text-sm ${showError ? "text-destructive" : ""}`}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`text-xs md:text-sm h-10 md:h-11 ${showError ? "border-destructive focus-visible:ring-destructive" : ""}`}
      />
      {showError && (
        <p className="text-[10px] md:text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {label} is required
        </p>
      )}
    </div>
  );
};

const SelectField = ({
  label, id, value, onValueChange, onBlur, showError, required, options, placeholder,
}: any) => {
  return (
    <div className="space-y-1.5 md:space-y-2">
      <Label className={`text-xs md:text-sm ${showError ? "text-destructive" : ""}`}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value || ""} onValueChange={onValueChange}>
        <SelectTrigger className={`text-xs md:text-sm h-10 md:h-11 ${showError ? "border-destructive focus-visible:ring-destructive" : ""}`} onBlur={onBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: any) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showError && (
        <p className="text-[10px] md:text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {label} is required
        </p>
      )}
    </div>
  );
};

export function Settings() {
  const { refreshRole } = useUserRole();
  const navigate = useNavigate();           // 👈 ADD
  const home = useHomeRoute();              // 👈 ADD
  const contentRef = useRef<HTMLDivElement | null>(null);  // 👈 ADD

  const handleBack = () => {                // 👈 ADD
    playSound("tap");
    if (navigator.vibrate) navigator.vibrate(20);
    navigate(home, { replace: true });
  };

  const [profile, setProfile] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [roleChanged, setRoleChanged] = useState(false);
  const isStudent = (profile?.role || "").toLowerCase().includes("student");
  const handleRoleChange = () => {
    setRoleChanged(true);
  };

  const getActiveRequiredFields = () => {
    const role = profile?.role?.toLowerCase() || "";
    const base = [
      { key: "name", label: "Full Name" },
      { key: "username", label: "Username" },
      { key: "phone", label: "Phone Number" },
      { key: "county", label: "County" },
    ];
    if (role.includes("student")) {
      return [...base, { key: "institution", label: "Institution" }, { key: "course", label: "Course" }, { key: "block", label: "Block" }, { key: "nck_number", label: "Exam Number" }];
    }
    return [...base, { key: "specialization", label: "Specialization" }, { key: "workplace", label: "Workplace" }, { key: "employment_type", label: "Employment Type" }, { key: "license_status", label: "License Status" }, { key: "nck_number", label: "NCK Number" }];
  };

  const activeRequiredFields = getActiveRequiredFields();
  const isFieldMissing = (key: string) => {
    const value = profile?.[key];
    if (value === 0) return false;
    return value === undefined || value === null || String(value).trim() === "";
  };
  const shouldShowError = (key: string) => touchedFields[key] && isFieldMissing(key);
  const handleBlur = (key: string) => setTouchedFields(prev => ({ ...prev, [key]: true }));

  useEffect(() => {
    const fetchProfile = async () => {
      setFetching(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { setFetching(false); return toast({ title: "Error", description: "User not found" }); }
      setUserId(user.id);
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (error) { toast({ title: "Error", description: "Could not load profile from database" }); }
      else {
        setProfile(data); setAvatarPreview(data.avatar_url || null);
        localStorage.setItem("userProfile", JSON.stringify(data));
        if (data.role) {
          localStorage.setItem(`userRole_${user.id}`, data.role);
          localStorage.setItem("last_known_role", data.role);
        }
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: data }));
      }
      setFetching(false);
    };
    fetchProfile();
  }, []);

  const handleChange = (key: string, value: any) => {
    setProfile((prev: any) => ({ ...prev, [key]: value }));
    if (touchedFields[key] && value && value !== "") setTouchedFields(prev => ({ ...prev, [key]: false }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) { toast({ title: "Unsupported Image", description: "Please select a JPG, PNG, GIF, or WEBP image." }); return; }
    if (file.size <= 10 * 1024 * 1024) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
    else { toast({ title: "Image too large", description: "Please select a file less than 10MB" }); }
  };

  const uploadToCloudinary = async (file: File) => {
    const cloudName = "dpj5vprwf"; const uploadPreset = "js1gxxdv";
    const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", uploadPreset);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error?.message || "Cloudinary upload failed"); }
    const data = await response.json(); return data.secure_url;
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !userId) return null;
    try { return await uploadToCloudinary(avatarFile); }
    catch (err: any) { toast({ title: "Upload Failed", description: "This image could not be uploaded. Please try another image." }); return null; }
  };

  const handleRemoveAvatar = async () => {
    if (!userId) return;
    try {
      const { error: dbError } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
      if (dbError) { toast({ title: "Error", description: "Failed to remove avatar reference" }); return; }
      const updatedProfile = { ...profile, avatar_url: null };
      setProfile(updatedProfile); setAvatarPreview(null); setAvatarFile(null);
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfile }));
      toast({ title: "Avatar Removed", description: "Your profile picture has been cleared." });
    } catch (err) { toast({ title: "Error", description: "Unexpected error while removing avatar" }); }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    const allTouched: Record<string, boolean> = {};
    activeRequiredFields.forEach(field => { allTouched[field.key] = true; });
    setTouchedFields(allTouched);
    const missingFields = activeRequiredFields.filter(field => isFieldMissing(field.key));
    if (missingFields.length > 0) {
      toast({ title: "Missing Required Fields", description: `Please fill in: ${missingFields.map(f => f.label).join(", ")}`, variant: "destructive" });
      return;
    }

    // Validate institution is a known slug (not raw text)
    if (profile.institution && profile.institution !== "other") {
      const known = institutions.some((i) => i.value === profile.institution);
      if (!known) {
        toast({
          title: "Invalid Institution",
          description: "Please select your institution from the dropdown list.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate county is a known slug
    if (profile.county) {
      const knownCounty = counties.some((c) => c.value === profile.county);
      if (!knownCounty) {
        toast({
          title: "Invalid County",
          description: "Please select your county from the dropdown list.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) { const uploadedUrl = await uploadAvatar(); if (uploadedUrl) avatarUrl = uploadedUrl; }

      const oldRole = localStorage.getItem("last_known_role");

      const updatableFields: any = {
        name: profile.name,
        username: profile.username,
        phone: profile.phone,
        institution: profile.institution,
        course: profile.course,
        block: profile.block,
        county: profile.county,
        bio: profile.bio,
        reset_question: profile.reset_question,
        reset_answer: profile.reset_answer,
        nck_number: profile.nck_number,
        specialization: profile.specialization,
        years_experience: profile.years_experience,
        workplace: profile.workplace,
        employment_type: profile.employment_type,
        license_issue_date: profile.license_issue_date,
        license_expiry_date: profile.license_expiry_date,
        license_status: profile.license_status,
        target_score: profile.target_score,
        avatar_url: avatarUrl,
        role: profile.role,
      };

      Object.keys(updatableFields).forEach(key => { if (updatableFields[key] === undefined) delete updatableFields[key]; });
      const { data, error } = await supabase.from("profiles").update(updatableFields).eq("user_id", userId).select('*');
      if (error) throw error;
      const updatedProfileData = data?.[0] || { ...profile, ...updatableFields };

      if (profile.role) {
        localStorage.setItem(`userRole_${userId}`, profile.role);
        localStorage.setItem("last_known_role", profile.role);
      }

      setProfile(updatedProfileData);
      localStorage.setItem("userProfile", JSON.stringify(updatedProfileData));

      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfileData }));

      if (profile.role && oldRole && profile.role !== oldRole) {
        await refreshRole();
        window.dispatchEvent(new CustomEvent('roleChanged', {
          detail: { role: profile.role, userId }
        }));
        toast({ title: "Role Updated!", description: "Page will reload to apply changes.", variant: "default" });
        setTimeout(() => { window.location.reload(); }, 1500);
        setLoading(false);
        return;
      }

      toast({ title: "Profile Saved!", description: "Your profile was updated successfully." });
    } catch (err: any) { toast({ title: "Error", description: err.message || "Failed to save profile" }); }
    finally { setLoading(false); }
  };

  if (fetching) return <SettingsSkeleton />;

  if (!profile) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center bg-background p-4">
        <Card className="text-center p-6 md:p-8 border-0 shadow-none">
          <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-destructive mx-auto mb-3 md:mb-4" />
          <CardTitle className="text-lg md:text-xl">Failed to Load Profile</CardTitle>
          <CardDescription className="text-xs md:text-sm">Could not load your profile data. Please try refreshing the page.</CardDescription>
          <Button onClick={() => window.location.reload()} className="mt-3 md:mt-4 text-xs md:text-sm">Refresh</Button>
        </Card>
      </div>
    );
  }
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
            Settings
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
            Manage your account and preferences
          </p>
        </div>
      </header>

      {/* Internally-scrolling content */}
      <div
        ref={contentRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
            custom-scrollbar overscroll-contain"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-24 safe-bottom space-y-3 md:space-y-4">
          <Card className="w-full overflow-hidden p-1 md:p-2 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
            <div className="mt-1 md:mt-2">
              <Tabs defaultValue="profile" className="space-y-1 md:space-y-2">
                {/* h2 "Settings" removed — the sticky header already says it */}

                <TabsContent value="profile">
                  <div className="flex flex-col gap-2 md:gap-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Avatar className="h-16 w-16 md:h-20 md:w-20">
                        <AvatarImage src={avatarPreview || profile.avatar_url || "/placeholder.svg"} className="object-cover" />
                        <AvatarFallback className="text-base md:text-lg">{profile.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 md:gap-1">
                        <p className="text-base md:text-lg font-semibold">{profile.name || "Not set"}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{profile.email || "Not set"}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Username: {profile.username || "Not set"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-1.5 md:gap-2 md:grid-cols-2">
                      <p className="text-xs md:text-sm"><span className="font-medium">Name:</span> <span className="text-muted-foreground">{profile.name || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">Username:</span> <span className="text-muted-foreground">{profile.username || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">Email:</span> <span className="text-muted-foreground">{profile.email || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">Phone:</span> <span className="text-muted-foreground">{profile.phone || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">County:</span> <span className="text-muted-foreground">{counties.find(c => c.value === profile.county)?.label || profile.county || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">Institution:</span> <span className="text-muted-foreground">{institutions.find(i => i.value === profile.institution)?.label || profile.institution || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">Course:</span> <span className="text-muted-foreground">{profile.course || "Not set"}</span></p>
                      <p className="text-xs md:text-sm"><span className="font-medium">Block:</span> <span className="text-muted-foreground">{profile.block || "Not set"}</span></p>
                      <p className="text-xs md:text-sm md:col-span-2"><span className="font-medium">Bio:</span> <span className="text-muted-foreground">{profile.bio || "Not set"}</span></p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>

          <RoleSwitch
            key={profile?.role}
            currentRole={profile?.role}
            userId={userId}
            onRoleChange={handleRoleChange}
          />

          <Tabs defaultValue="profile" className="space-y-1 md:space-y-2">
            {!isStudent && (
              <TabsList className="grid w-full grid-cols-2 h-10 md:h-11 text-xs md:text-sm rounded-lg md:rounded-xl">
                <TabsTrigger value="profile" className="rounded-lg md:rounded-xl">Profile</TabsTrigger>
                <TabsTrigger value="professional" className="rounded-lg md:rounded-xl">Professional</TabsTrigger>
              </TabsList>
            )}
            <TabsContent value="profile">
              <Card className="rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
                <CardHeader className="px-1 md:px-2 pt-1 md:pt-2">
                  <CardTitle className="text-lg md:text-xl">Edit Profile Information</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Update your personal and academic details. Fields marked with <span className="text-destructive">*</span> are required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 px-1 md:px-2 pb-1 md:pb-2">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
                    <Avatar className="h-16 w-16 md:h-20 md:w-20">
                      <AvatarImage src={avatarPreview || profile.avatar_url || "/placeholder.svg"} className="object-cover" />
                      <AvatarFallback className="text-base md:text-lg">{profile.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 md:gap-2">
                      <Input type="file" accept="image/*" onChange={handleAvatarChange} className="text-xs md:text-sm h-9 md:h-10" />
                      <div className="flex gap-1 md:gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="text-[10px] md:text-xs h-8 md:h-9"><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" /> Remove</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Remove your avatar?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRemoveAvatar}>Remove</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">JPG, PNG or GIF. Max 10MB.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Security */}
                  <div className="space-y-2 md:space-y-3">
                    <h3 className="text-sm md:text-lg font-semibold">Security / Recovery Information</h3>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="reset_question" className="text-xs md:text-sm">Security Question</Label>
                      <Select value={profile.reset_question || ""} onValueChange={(value) => handleChange("reset_question", value)}>
                        <SelectTrigger className="w-full text-xs md:text-sm h-10 md:h-11"><SelectValue placeholder="Select a security question" /></SelectTrigger>
                        <SelectContent>
                          {["What was your first pet's name?", "What is your mother's maiden name?", "What was the name of your first school?", "What is your favorite book?", "What city were you born in?", "What is your favorite color?", "What was your childhood nickname?", "What is the name of your favorite teacher?", "What is your favorite movie?", "What is the name of your best friend?"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="reset_answer" className="text-xs md:text-sm">Security Answer</Label>
                      <Input id="reset_answer" value={profile.reset_answer || ""} onChange={(e) => handleChange("reset_answer", e.target.value)} placeholder="Your answer here" type="password" className="text-xs md:text-sm h-10 md:h-11" />
                      <p className="text-[10px] md:text-xs text-muted-foreground">Used to verify identity if you forget your password.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Info */}
                  <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                    <FormField label="Full Name" id="name" value={profile.name} onChange={(e: any) => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")} showError={shouldShowError("name")} required placeholder="Enter your full name" />
                    <FormField label="Username" id="username" value={profile.username} onChange={(e: any) => handleChange("username", e.target.value)} onBlur={() => handleBlur("username")} showError={shouldShowError("username")} required placeholder="Choose a username" />
                  </div>
                  <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="email" className="text-xs md:text-sm">Email</Label>
                      <Input id="email" value={profile.email || ""} onChange={(e) => handleChange("email", e.target.value)} disabled className="bg-muted text-xs md:text-sm h-10 md:h-11" />
                      <p className="text-[10px] md:text-xs text-muted-foreground">Email cannot be changed here</p>
                    </div>
                    <FormField label="Phone Number" id="phone" value={profile.phone} onChange={(e: any) => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} showError={shouldShowError("phone")} required placeholder="Enter your phone number" />
                  </div>

                  {/* Academic Info */}
                  <Separator />
                  <div className="space-y-2 md:space-y-3">
                    <h3 className="text-sm md:text-lg font-semibold flex items-center gap-1.5 md:gap-2">
                      <GraduationCap className="h-4 w-4 md:h-5 md:w-5" /> Academic Information
                    </h3>

                    <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                      {/* Institution — searchable dropdown */}
                      <div className="space-y-1.5 md:space-y-2">
                        <Label className={`text-xs md:text-sm ${shouldShowError("institution") ? "text-destructive" : ""}`}>
                          Institution <span className="text-destructive">*</span>
                        </Label>
                        <SearchableInstitutionPicker
                          value={profile.institution || ""}
                          onChange={(v) => handleChange("institution", v)}
                          hasError={shouldShowError("institution")}
                        />
                        {shouldShowError("institution") && (
                          <p className="text-[10px] md:text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Institution is required
                          </p>
                        )}
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          Used for School Wars leaderboard
                        </p>
                      </div>

                      {/* Course — free text (unchanged) */}
                      <FormField label="Course" id="course" value={profile.course} onChange={(e: any) => handleChange("course", e.target.value)} onBlur={() => handleBlur("course")} showError={shouldShowError("course")} required placeholder="Course name" />
                    </div>

                    <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                      <FormField label="Block" id="block" value={profile.block} onChange={(e: any) => handleChange("block", e.target.value)} onBlur={() => handleBlur("block")} showError={shouldShowError("block")} required placeholder="Your block/year" />

                      {/* County — searchable dropdown */}
                      <div className="space-y-1.5 md:space-y-2">
                        <Label className={`text-xs md:text-sm ${shouldShowError("county") ? "text-destructive" : ""}`}>
                          County <span className="text-destructive">*</span>
                        </Label>
                        <CountyPicker
                          value={profile.county || ""}
                          onChange={(v) => handleChange("county", v)}
                          hasError={shouldShowError("county")}
                        />
                        {shouldShowError("county") && (
                          <p className="text-[10px] md:text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> County is required
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="bio" className="text-xs md:text-sm">Bio</Label>
                      <Input id="bio" value={profile.bio || ""} onChange={(e) => handleChange("bio", e.target.value)} placeholder="Tell us about yourself" className="text-xs md:text-sm h-10 md:h-11" />
                    </div>
                  </div>
                  {/* Professional + License — hidden for students */}
                  {!isStudent && (
                    <>
                      <Separator />
                      <div className="space-y-2 md:space-y-3">
                        <h3 className="text-sm md:text-lg font-semibold">Professional Information</h3>
                        <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                          <FormField label="NCK Number" id="nck_number" value={profile.nck_number} onChange={(e: any) => handleChange("nck_number", e.target.value)} onBlur={() => handleBlur("nck_number")} showError={shouldShowError("nck_number")} required placeholder="Your NCK number" />
                          <FormField label="Specialization" id="specialization" value={profile.specialization} onChange={(e: any) => handleChange("specialization", e.target.value)} onBlur={() => handleBlur("specialization")} showError={shouldShowError("specialization")} required placeholder="Your medical specialization" />
                        </div>
                        <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                          <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="years_experience" className="text-xs md:text-sm">Years of Experience</Label>
                            <Input id="years_experience" type="number" value={profile.years_experience ?? ""} onChange={(e) => handleChange("years_experience", e.target.value === "" ? null : Number(e.target.value))} placeholder="Years of experience" className="text-xs md:text-sm h-10 md:h-11" />
                          </div>
                          <FormField label="Workplace" id="workplace" value={profile.workplace} onChange={(e: any) => handleChange("workplace", e.target.value)} onBlur={() => handleBlur("workplace")} showError={shouldShowError("workplace")} required placeholder="Where do you work?" />
                        </div>
                        <SelectField label="Employment Type" id="employment_type" value={profile.employment_type} onValueChange={(value: string) => handleChange("employment_type", value)} onBlur={() => handleBlur("employment_type")} showError={shouldShowError("employment_type")} required options={[{ value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" }, { value: "volunteer", label: "Volunteer" }, { value: "student", label: "Student" }, { value: "unemployed", label: "Unemployed" }]} placeholder="Select employment type" />
                      </div>

                      <Separator />
                      <div className="space-y-2 md:space-y-3">
                        <h3 className="text-sm md:text-lg font-semibold">License Information</h3>
                        <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                          <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="license_issue_date" className="text-xs md:text-sm">License Issue Date</Label>
                            <Input id="license_issue_date" type="date" value={profile.license_issue_date || ""} onChange={(e) => handleChange("license_issue_date", e.target.value)} className="text-xs md:text-sm h-10 md:h-11" />
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="license_expiry_date" className="text-xs md:text-sm">License Expiry Date</Label>
                            <Input id="license_expiry_date" type="date" value={profile.license_expiry_date || ""} onChange={(e) => handleChange("license_expiry_date", e.target.value)} className="text-xs md:text-sm h-10 md:h-11" />
                          </div>
                        </div>
                        <SelectField label="License Status" id="license_status" value={profile.license_status} onValueChange={(value: string) => handleChange("license_status", value)} onBlur={() => handleBlur("license_status")} showError={shouldShowError("license_status")} required options={[{ value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "suspended", label: "Suspended" }, { value: "pending_renewal", label: "Pending Renewal" }]} placeholder="Select license status" />
                      </div>
                    </>
                  )}
                  {/* Student fallback — explain why Professional info is not shown */}
                  {isStudent && (
                    <>
                      <Separator />
                      <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/20 p-3 md:p-4 space-y-1.5 md:space-y-2">
                        <h3 className="text-sm md:text-base font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          Professional info isn't needed for students
                        </h3>
                        <p className="text-[11px] md:text-xs text-blue-800/90 dark:text-blue-200/80 leading-relaxed">
                          Fields like <strong>Specialization</strong>, <strong>Workplace</strong>, <strong>Employment Type</strong>, and <strong>License details</strong> apply to
                          registered nurses and staff — not students. Once you graduate and register
                          with the Nursing Council of Kenya (NCK), those fields unlock automatically
                          on your account.
                        </p>
                        <p className="text-[10px] md:text-xs text-blue-700/70 dark:text-blue-300/70 leading-relaxed pt-0.5">
                          For now, focus on your <strong>Academic Information</strong> and <strong>Exam Number</strong> — those are what we use to place you in quizzes and School Wars.
                        </p>
                      </div>
                    </>
                  )}
                  {/* Student-only: NCK / Exam number — kept because students DO have one */}
                  {isStudent && (
                    <>
                      <Separator />
                      <div className="space-y-2 md:space-y-3">
                        <h3 className="text-sm md:text-lg font-semibold">Exam Details</h3>
                        <FormField label="NCK / Exam Number" id="nck_number_student" value={profile.nck_number} onChange={(e: any) => handleChange("nck_number", e.target.value)} onBlur={() => handleBlur("nck_number")} showError={shouldShowError("nck_number")} required placeholder="Your exam number" />
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          Your index number for the NCK / FQE exam. Provided by your institution.
                        </p>
                      </div>
                    </>
                  )}
                  <Button onClick={handleSaveProfile} className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto text-xs md:text-sm h-10 md:h-11" disabled={loading}>
                    <Save className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}