"use client";
import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  User,
  GraduationCap,
  Save,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
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
// Settings.tsx
import { RoleSwitch } from "@/components/settings/RoleSwitch";
// IMPORT THE ROLE CONTEXT
import { useUserRole } from "@/context/UserRoleContext";

// Skeleton Components
function SettingsSkeleton() {
  return (
    <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] p-0 md:p-4 pb-20 md:pb-6">
      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-0 md:space-y-6 animate-pulse">
        {/* Profile Summary Card Skeleton */}
        <Card className="w-full md:border-0 overflow-hidden p-4 md:p-6 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
          <div className="mt-4 md:mt-6">
            <div className="space-y-3 md:space-y-4">
              <div className="h-8 md:h-10 w-32 md:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 md:h-5 w-48 md:w-72 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex flex-col gap-0.5 md:gap-1">
                    <div className="h-5 md:h-6 w-32 md:w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 md:h-4 w-40 md:w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 md:h-4 w-32 md:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-4 md:h-5 w-32 md:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Form Tabs Skeleton */}
        <div className="space-y-4 md:space-y-6">
          <div className="grid w-full grid-cols-2 h-10 md:h-11 gap-1 mx-4 md:mx-0">
            <div className="h-10 md:h-11 bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl" />
            <div className="h-10 md:h-11 bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl" />
          </div>

          <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
              <div className="h-6 md:h-7 w-48 md:w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 md:h-5 w-64 md:w-96 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-4 md:pb-6">
              {/* Avatar Section Skeleton */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex flex-col gap-1.5 md:gap-2 w-full sm:w-auto">
                  <div className="h-9 md:h-10 w-full sm:w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="flex gap-1.5 md:gap-2">
                    <div className="h-8 md:h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-3 md:h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-gray-700" />

              {/* Security Section Skeleton */}
              <div className="space-y-3 md:space-y-4">
                <div className="h-5 md:h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 md:h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-gray-700" />

              {/* Personal Info Skeleton */}
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-1.5 md:space-y-2">
                    <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 md:h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>

              {/* Academic Info Skeleton */}
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-3 md:space-y-4">
                <div className="h-5 md:h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 md:space-y-2">
                      <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 md:space-y-2">
                      <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>

              {/* Professional Info Skeleton */}
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-3 md:space-y-4">
                <div className="h-5 md:h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 md:space-y-2">
                      <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>

              {/* License Info Skeleton */}
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-3 md:space-y-4">
                <div className="h-5 md:h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 md:space-y-2">
                      <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>

              {/* App Info Skeleton */}
              <Separator className="bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-3 md:space-y-4">
                <div className="h-5 md:h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="h-4 md:h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 md:h-11 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-4 md:h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>

              {/* Save Button Skeleton */}
              <div className="h-10 md:h-11 w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// FormField and SelectField remain the same...
const FormField = ({
  label, id, value, onChange, onBlur, showError, required, type = "text", placeholder
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
  label, id, value, onValueChange, onBlur, showError, required, options, placeholder
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
  // ADD THIS - Get refreshRole from context
  const { refreshRole } = useUserRole();

  const [profile, setProfile] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  // Add a state for role change callback
  const [roleChanged, setRoleChanged] = useState(false);

  // Handle role change callback
  const handleRoleChange = () => {
    // You can do additional stuff here if needed
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
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) { toast({ title: "Unsupported Image", description: "Please select a JPG, PNG, GIF, or WEBP image." }); return; }
    if (file && file.size <= 10 * 1024 * 1024) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
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

  // 🔥 UPDATED: handleSaveProfile with Role Context integration
  const handleSaveProfile = async () => {
    if (!userId) return;
    const allTouched: Record<string, boolean> = {};
    activeRequiredFields.forEach(field => { allTouched[field.key] = true; });
    setTouchedFields(allTouched);
    const missingFields = activeRequiredFields.filter(field => isFieldMissing(field.key));
    if (missingFields.length > 0) { toast({ title: "Missing Required Fields", description: `Please fill in: ${missingFields.map(f => f.label).join(", ")}`, variant: "destructive" }); return; }
    setLoading(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) { const uploadedUrl = await uploadAvatar(); if (uploadedUrl) avatarUrl = uploadedUrl; }

      // Store old role before update
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
        // Include role in the update
        role: profile.role,
      };

      Object.keys(updatableFields).forEach(key => { if (updatableFields[key] === undefined) delete updatableFields[key]; });
      const { data, error } = await supabase.from("profiles").update(updatableFields).eq("user_id", userId).select('*');
      if (error) throw error;
      const updatedProfileData = data?.[0] || { ...profile, ...updatableFields };

      // Update localStorage
      if (profile.role) {
        localStorage.setItem(`userRole_${userId}`, profile.role);
        localStorage.setItem("last_known_role", profile.role);
      }

      setProfile(updatedProfileData);
      localStorage.setItem("userProfile", JSON.stringify(updatedProfileData));

      // Dispatch profile update event
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedProfileData }));

      // 🔥 NEW: Check if role changed
      if (profile.role && oldRole && profile.role !== oldRole) {
        // Update the role context
        await refreshRole();

        // Dispatch role change event
        window.dispatchEvent(new CustomEvent('roleChanged', {
          detail: { role: profile.role, userId }
        }));

        toast({
          title: "Role Updated!",
          description: "Page will reload to apply changes.",
          variant: "default"
        });

        // Force reload after a delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);

        setLoading(false);
        return;
      }

      toast({ title: "Profile Saved!", description: "Your profile was updated successfully." });
    } catch (err: any) { toast({ title: "Error", description: err.message || "Failed to save profile" }); }
    finally { setLoading(false); }
  };

  // Show skeleton while fetching
  if (fetching) {
    return <SettingsSkeleton />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center bg-background p-4">
        <Card className="text-center p-6 md:p-8">
          <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-destructive mx-auto mb-3 md:mb-4" />
          <CardTitle className="text-lg md:text-xl">Failed to Load Profile</CardTitle>
          <CardDescription className="text-xs md:text-sm">Could not load your profile data. Please try refreshing the page.</CardDescription>
          <Button onClick={() => window.location.reload()} className="mt-3 md:mt-4 text-xs md:text-sm">Refresh</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] p-0 md:p-4 pb-20 md:pb-6">
      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-0 md:space-y-6">

        {/* Profile Summary Card - full width on mobile */}
        <Card className="w-full md:border-0 overflow-hidden p-4 md:p-6 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
          <div className="mt-4 md:mt-6">
            <Tabs defaultValue="profile" className="space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-4xl font-bold text-start bg-gradient-medical bg-clip-text text-transparent">
                Settings
              </h2>
              <h2 className="text-xs md:text-sm font-bold text-start bg-gradient-medical bg-clip-text text-transparent">
                Manage your profile information
              </h2>
              <TabsContent value="profile">
                <div className="flex flex-col gap-4 md:gap-6">
                  <div className="flex items-center gap-3 md:gap-4">
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
                  <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                    <p className="text-xs md:text-sm font-medium">Phone: {profile.phone || "Not set"}</p>
                    <p className="text-xs md:text-sm font-medium">Institution: {profile.institution || "Not set"}</p>
                    <p className="text-xs md:text-sm font-medium">Course: {profile.course || "Not set"}</p>
                    <p className="text-xs md:text-sm font-medium">Block: {profile.block || "Not set"}</p>
                    <p className="text-xs md:text-sm font-medium">County: {profile.county || "Not set"}</p>
                    <p className="text-xs md:text-sm font-medium">Bio: {profile.bio || "Not set"}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>

        {/* Add RoleSwitch here - after profile summary or before tabs */}
        <div className="px-4 md:px-0">
          <RoleSwitch
            key={profile?.role} // Forces re-render when role changes
            currentRole={profile?.role}
            userId={userId}
            onRoleChange={handleRoleChange}
          />
        </div>
        {/* Edit Form Tabs - full width on mobile */}
        <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-10 md:h-11 text-xs md:text-sm mx-4 md:mx-0">
            <TabsTrigger value="profile" className="rounded-lg md:rounded-xl">Profile</TabsTrigger>
            <TabsTrigger value="professional" className="rounded-lg md:rounded-xl">Professional</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
              <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
                <CardTitle className="text-lg md:text-xl">Edit Profile Information</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Update your personal and academic details. Fields marked with <span className="text-destructive">*</span> are required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-4 md:pb-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20">
                    <AvatarImage src={avatarPreview || profile.avatar_url || "/placeholder.svg"} className="object-cover" />
                    <AvatarFallback className="text-base md:text-lg">{profile.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    <Input type="file" accept="image/*" onChange={handleAvatarChange} className="text-xs md:text-sm h-9 md:h-10" />
                    <div className="flex gap-1.5 md:gap-2">
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
                <div className="space-y-3 md:space-y-4">
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
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <FormField label="Full Name" id="name" value={profile.name} onChange={(e: any) => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")} showError={shouldShowError("name")} required placeholder="Enter your full name" />
                  <FormField label="Username" id="username" value={profile.username} onChange={(e: any) => handleChange("username", e.target.value)} onBlur={() => handleBlur("username")} showError={shouldShowError("username")} required placeholder="Choose a username" />
                </div>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="email" className="text-xs md:text-sm">Email</Label>
                    <Input id="email" value={profile.email || ""} onChange={(e) => handleChange("email", e.target.value)} disabled className="bg-muted text-xs md:text-sm h-10 md:h-11" />
                    <p className="text-[10px] md:text-xs text-muted-foreground">Email cannot be changed here</p>
                  </div>
                  <FormField label="Phone Number" id="phone" value={profile.phone} onChange={(e: any) => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} showError={shouldShowError("phone")} required placeholder="Enter your phone number" />
                </div>

                {/* Academic Info */}
                <Separator />
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-sm md:text-lg font-semibold flex items-center gap-1.5 md:gap-2"><GraduationCap className="h-4 w-4 md:h-5 md:w-5" />Academic Information</h3>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <FormField label="Institution" id="institution" value={profile.institution} onChange={(e: any) => handleChange("institution", e.target.value)} onBlur={() => handleBlur("institution")} showError={shouldShowError("institution")} required placeholder="Your school/university" />
                    <FormField label="Course" id="course" value={profile.course} onChange={(e: any) => handleChange("course", e.target.value)} onBlur={() => handleBlur("course")} showError={shouldShowError("course")} required placeholder="Course name" />
                  </div>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <FormField label="Block" id="block" value={profile.block} onChange={(e: any) => handleChange("block", e.target.value)} onBlur={() => handleBlur("block")} showError={shouldShowError("block")} required placeholder="Your block/year" />
                    <FormField label="County" id="county" value={profile.county} onChange={(e: any) => handleChange("county", e.target.value)} onBlur={() => handleBlur("county")} showError={shouldShowError("county")} required placeholder="Your county" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="bio" className="text-xs md:text-sm">Bio</Label>
                    <Input id="bio" value={profile.bio || ""} onChange={(e) => handleChange("bio", e.target.value)} placeholder="Tell us about yourself" className="text-xs md:text-sm h-10 md:h-11" />
                  </div>
                </div>

                {/* Professional Information */}
                <Separator />
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-sm md:text-lg font-semibold">Professional Information</h3>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <FormField label="NCK Number/Exam number" id="nck_number" value={profile.nck_number} onChange={(e: any) => handleChange("nck_number", e.target.value)} onBlur={() => handleBlur("nck_number")} showError={shouldShowError("nck_number")} required placeholder="Your NCK or exam number" />
                    <FormField label="Specialization" id="specialization" value={profile.specialization} onChange={(e: any) => handleChange("specialization", e.target.value)} onBlur={() => handleBlur("specialization")} showError={shouldShowError("specialization")} required placeholder="Your medical specialization" />
                  </div>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="years_experience" className="text-xs md:text-sm">Years of Experience</Label>
                      <Input id="years_experience" type="number" value={profile.years_experience ?? ""} onChange={(e) => handleChange("years_experience", e.target.value === "" ? null : Number(e.target.value))} placeholder="Years of experience" className="text-xs md:text-sm h-10 md:h-11" />
                    </div>
                    <FormField label="Workplace" id="workplace" value={profile.workplace} onChange={(e: any) => handleChange("workplace", e.target.value)} onBlur={() => handleBlur("workplace")} showError={shouldShowError("workplace")} required placeholder="Where do you work?" />
                  </div>
                  <SelectField label="Employment Type" id="employment_type" value={profile.employment_type} onValueChange={(value: string) => handleChange("employment_type", value)} onBlur={() => handleBlur("employment_type")} showError={shouldShowError("employment_type")} required options={[{ value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" }, { value: "volunteer", label: "Volunteer" }, { value: "student", label: "Student" }, { value: "unemployed", label: "Unemployed" }]} placeholder="Select employment type" />
                </div>

                {/* License Information */}
                <Separator />
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-sm md:text-lg font-semibold">License Information</h3>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
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

                {/* App Info */}
                <Separator />
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-sm md:text-lg font-semibold">App Information</h3>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="target_score" className="text-xs md:text-sm">Target Score</Label>
                      <Input id="target_score" type="number" value={profile.target_score || 50} onChange={(e) => handleChange("target_score", e.target.value)} className="text-xs md:text-sm h-10 md:h-11" />
                    </div>
                  </div>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <p className="text-xs md:text-sm font-medium">Last Seen: {profile.last_seen || "Never"}</p>
                    <p className="text-xs md:text-sm font-medium">Online: {profile.is_online ? "Yes" : "No"}</p>
                  </div>
                </div>

                {/* Save Button */}
                <Button onClick={handleSaveProfile} className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto text-xs md:text-sm h-10 md:h-11" disabled={loading}>
                  <Save className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional">
            <Card className="md:border-0 rounded-none md:rounded-xl border-b border-gray-100 dark:border-gray-800 md:border-b-0">
              <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
                <CardTitle className="text-lg md:text-xl">Professional Information</CardTitle>
                <CardDescription className="text-xs md:text-sm">Update your professional and license details. Fields marked with <span className="text-destructive">*</span> are required.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-4 md:pb-6">
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <FormField label="NCK Number/Exam number" id="nck_number_pro" value={profile.nck_number} onChange={(e: any) => handleChange("nck_number", e.target.value)} onBlur={() => handleBlur("nck_number")} showError={shouldShowError("nck_number")} required placeholder="Your NCK or exam number" />
                  <FormField label="Specialization" id="specialization_pro" value={profile.specialization} onChange={(e: any) => handleChange("specialization", e.target.value)} onBlur={() => handleBlur("specialization")} showError={shouldShowError("specialization")} required placeholder="Your medical specialization" />
                </div>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="years_experience_pro" className="text-xs md:text-sm">Years of Experience</Label>
                    <Input id="years_experience_pro" type="number" value={profile.years_experience ?? ""} onChange={(e) => handleChange("years_experience", e.target.value === "" ? null : Number(e.target.value))} placeholder="Years of experience" className="text-xs md:text-sm h-10 md:h-11" />
                  </div>
                  <FormField label="Workplace" id="workplace_pro" value={profile.workplace} onChange={(e: any) => handleChange("workplace", e.target.value)} onBlur={() => handleBlur("workplace")} showError={shouldShowError("workplace")} required placeholder="Where do you work?" />
                </div>
                <SelectField label="Employment Type" id="employment_type_pro" value={profile.employment_type} onValueChange={(value: string) => handleChange("employment_type", value)} onBlur={() => handleBlur("employment_type")} showError={shouldShowError("employment_type")} required options={[{ value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" }, { value: "volunteer", label: "Volunteer" }, { value: "student", label: "Student" }, { value: "unemployed", label: "Unemployed" }]} placeholder="Select employment type" />
                <Separator />
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-sm md:text-lg font-semibold">License Information</h3>
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:space-y-2"><Label htmlFor="license_issue_date_pro" className="text-xs md:text-sm">License Issue Date</Label><Input id="license_issue_date_pro" type="date" value={profile.license_issue_date || ""} onChange={(e) => handleChange("license_issue_date", e.target.value)} className="text-xs md:text-sm h-10 md:h-11" /></div>
                    <div className="space-y-1.5 md:space-y-2"><Label htmlFor="license_expiry_date_pro" className="text-xs md:text-sm">License Expiry Date</Label><Input id="license_expiry_date_pro" type="date" value={profile.license_expiry_date || ""} onChange={(e) => handleChange("license_expiry_date", e.target.value)} className="text-xs md:text-sm h-10 md:h-11" /></div>
                  </div>
                  <SelectField label="License Status" id="license_status_pro" value={profile.license_status} onValueChange={(value: string) => handleChange("license_status", value)} onBlur={() => handleBlur("license_status")} showError={shouldShowError("license_status")} required options={[{ value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "suspended", label: "Suspended" }, { value: "pending_renewal", label: "Pending Renewal" }]} placeholder="Select license status" />
                </div>
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
  );
}