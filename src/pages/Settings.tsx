"use client";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust the path if needed
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
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

export function Settings() {
  // State variables
  const cachedProfile = JSON.parse(localStorage.getItem("userProfile") || "null");
  const [profile, setProfile] = useState<any>(cachedProfile);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return toast({ title: "Error", description: "User not found" });
      }

      setUserId(user.id);

      // Only fetch if no cached profile
      if (!cachedProfile) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          toast({ title: "Error", description: "Could not load profile" });
        } else {
          setProfile(data);
          setAvatarPreview(data.avatar_url || null);
          localStorage.setItem("userProfile", JSON.stringify(data));
        }
      } else {
        // use cached avatar preview
        setAvatarPreview(cachedProfile.avatar_url || null);
      }
    };

    fetchProfile();
  }, []);


  // Handle input changes
  const handleChange = (key: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [key]: value }));
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      toast({
        title: "Image too large",
        description: "Please select a file less than 10MB",
      });
    }
  };

  // Upload avatar (PRESERVED)
  // Upload avatar (with cache-busting)
  const uploadAvatar = async () => {
    if (!avatarFile || !userId) return null;

    const fileExt = avatarFile.name.split(".").pop();
    const folder = "avatars";
    const filePath = `${folder}/${userId}-avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profilepics")
      .upload(filePath, avatarFile, {
        cacheControl: "60", // only cache for 60 seconds
        upsert: true,
      });

    if (uploadError) {
      toast({ title: "Upload Failed", description: uploadError.message });
      return null;
    }

    const { data } = supabase.storage.from("profilepics").getPublicUrl(filePath);

    // 👇 Add a timestamp to bust browser cache
    return `${data.publicUrl}?t=${Date.now()}`;
  };



  // Remove avatar with confirmation
  const handleRemoveAvatar = async () => {
    if (!userId) return;

    try {
      // 👇 figure out the folder + filename convention
      const folder = "avatars";
      const fileExt = profile?.avatar_url?.split(".").pop() || "png";
      const filePath = `${folder}/${userId}-avatar.${fileExt}`;

      // 1. Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from("profilepics")
        .remove([filePath]);

      if (storageError) {
        toast({ title: "Error", description: "Failed to delete file from storage" });
        console.error(storageError);
        return;
      }

      // 2. Clear DB field
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", userId);

      if (dbError) {
        toast({ title: "Error", description: "Failed to remove avatar reference" });
        console.error(dbError);
        return;
      }

      // 3. Update local state
      setProfile((prev: any) => ({ ...prev, avatar_url: null }));
      setAvatarPreview(null);
      setAvatarFile(null);

      toast({
        title: "Avatar Removed",
        description: "Your avatar has been deleted.",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Unexpected error while removing avatar" });
    }
  };


  // Save profile
  const handleSaveProfile = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      const { email, ...profileWithoutEmail } = profile;

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...profileWithoutEmail,
          avatar_url: avatarUrl,
        })
        .eq("user_id", userId)
        .select();

      if (error) throw error;

      const updatedProfile = { ...profile, avatar_url: avatarUrl };

      setProfile(updatedProfile);
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));

      toast({
        title: "Profile Saved!",
        description: "Your profile was updated successfully.",
      });

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save profile",
      });
    } finally {
      setLoading(false);
    }
  };
  // Only show loader if profile is not in cache
  if (!profile && !cachedProfile) {
    return <GlobalLoader message="Loading profile..." />;
  }


  return (
    <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)]  ">
      <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6">

        <Card className="w-full border-0 overflow-hidden p-6">


          {/* Tabs + profile info: left-aligned */}
          <div className="mt-6">
            <Tabs defaultValue="profile" className="space-y-4">

              {/* Title */}
              <h2 className="text-4xl font-bold text-start bg-gradient-medical bg-clip-text text-transparent">
                Settings
              </h2>
              <h2 className="text-sm font-bold text-start bg-gradient-medical bg-clip-text text-transparent">
                Manage your profile information
              </h2>
              <TabsContent value="profile">
                {/* Profile info inside the tab with avatar */}
                <div className="flex flex-col gap-6">
                  {/* Avatar and basic info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={profile.avatar_url || "/placeholder.svg"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg">
                        {profile.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold">{profile.name || "Not set"}</p>
                      <p className="text-sm text-muted-foreground">{profile.email || "Not set"}</p>
                      <p className="text-sm text-muted-foreground">Username: {profile.username || "Not set"}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Extended profile info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <p className="text-sm font-medium">Phone: {profile.phone || "Not set"}</p>
                    <p className="text-sm font-medium">Institution: {profile.institution || "Not set"}</p>
                    <p className="text-sm font-medium">Course: {profile.course || "Not set"}</p>
                    <p className="text-sm font-medium">Block: {profile.block || "Not set"}</p>
                    <p className="text-sm font-medium">County: {profile.county || "Not set"}</p>
                    <p className="text-sm font-medium">Bio: {profile.bio || "Not set"}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
        <Tabs defaultValue="profile" className="space-y-6">


          <TabsContent value="profile">
            <Card className=" border-0">
              <CardHeader>
                <CardTitle>Edit Profile Information</CardTitle>
                <CardDescription>
                  Update your personal and academic details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={avatarPreview || "/placeholder.svg"}
                      className="object-cover"
                    />

                    <AvatarFallback className="text-lg">
                      {profile.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" /> Remove Avatar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove your avatar?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. Your profile picture
                              will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemoveAvatar}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG or GIF. Max size 10MB.
                    </p>
                  </div>
                </div>

                {/* Security / Password Reset Info */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Security / Recovery Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="reset_question">Reset Question</Label>
                    <Input
                      id="reset_question"
                      value={profile.reset_question || ""}
                      onChange={(e) => handleChange("reset_question", e.target.value)}
                      placeholder="e.g. What is your favorite color?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset_answer">Reset Answer</Label>
                    <Input
                      id="reset_answer"
                      value={profile.reset_answer || ""}
                      onChange={(e) => handleChange("reset_answer", e.target.value)}
                      placeholder="Your answer here"
                      type="password"
                    />
                  </div>
                </div>
                <Separator />

                {/* Personal Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name || ""}
                      onChange={(e) => handleChange("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username || ""}
                      onChange={(e) => handleChange("username", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                </div>

                {/* Academic Info */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Academic Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="institution">Institution</Label>
                      <Input
                        id="institution"
                        value={profile.institution || ""}
                        onChange={(e) =>
                          handleChange("institution", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Input
                        id="course"
                        value={profile.course || ""}
                        onChange={(e) => handleChange("course", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="block">Block</Label>
                      <Input
                        id="block"
                        value={profile.block || ""}
                        onChange={(e) => handleChange("block", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        value={profile.county || ""}
                        onChange={(e) => handleChange("county", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={profile.bio || ""}
                      onChange={(e) => handleChange("bio", e.target.value)}
                    />
                  </div>
                </div>
                {/* Professional Information */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Professional Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nck_number">NCK Number/Exam number</Label>
                      <Input
                        id="nck_number"
                        value={profile.nck_number || ""}
                        onChange={(e) => handleChange("nck_number", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        value={profile.specialization || ""}
                        onChange={(e) => handleChange("specialization", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="years_experience">Years of Experience</Label>
                      <Input
                        id="years_experience"
                        type="number"
                        value={profile.years_experience ?? ""}
                        onChange={(e) =>
                          handleChange(
                            "years_experience",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workplace">Workplace</Label>
                      <Input
                        id="workplace"
                        value={profile.workplace || ""}
                        onChange={(e) => handleChange("workplace", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employment_type">Employment Type</Label>
                    <Input
                      id="employment_type"
                      value={profile.employment_type || ""}
                      onChange={(e) => handleChange("employment_type", e.target.value)}
                    />
                  </div>
                </div>

                {/* License Information */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">License Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="license_issue_date">License Issue Date</Label>
                      <Input
                        id="license_issue_date"
                        type="date"
                        value={profile.license_issue_date || ""}
                        onChange={(e) => handleChange("license_issue_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_expiry_date">License Expiry Date</Label>
                      <Input
                        id="license_expiry_date"
                        type="date"
                        value={profile.license_expiry_date || ""}
                        onChange={(e) => handleChange("license_expiry_date", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_status">License Status</Label>
                    <Input
                      id="license_status"
                      value={profile.license_status || "active"}
                      onChange={(e) => handleChange("license_status", e.target.value)}
                    />
                  </div>
                </div>

                {/* App / Performance Info */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">App Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="target_score">Target Score</Label>
                      <Input
                        id="target_score"
                        type="number"
                        value={profile.target_score || 50}
                        onChange={(e) => handleChange("target_score", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <p className="text-sm font-medium">Last Seen: {profile.last_seen || "Never"}</p>
                    <p className="text-sm font-medium">Online: {profile.is_online ? "Yes" : "No"}</p>
                  </div>
                </div>
                {/* Save Button */}
                <Button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
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
