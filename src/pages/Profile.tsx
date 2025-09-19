import {
  User, Mail, Phone, MapPin, School, Calendar, Edit, Camera, Eye, EyeOff
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
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
export function Profile() {
 const cachedProfile = JSON.parse(localStorage.getItem("userProfile") || "null");
const [profileState, setProfileState] = useState(cachedProfile);

  const user = useUser();
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
const handleLogout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("userProfile");
  localStorage.removeItem("userStreak");
  navigate("/", { replace: true });
  toast({ title: "Logged out", description: "You have been logged out." });
};

const handleDeleteAccount = async () => {
  if (!user) return;
  setDeleting(true);

  try {
    // ✅ Always get fresh access token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      toast({ title: "Error", description: "No active session found." });
      return;
    }

    const res = await fetch(
      "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/delete-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
        
      }
    );

    const data = await res.json();

    if (!res.ok) {
      toast({
        title: "Error",
        description: data.error || "Something went wrong while deleting your account.",
      });
      return;
    }

    toast({
      title: "Deleted",
      description: "Your account has been permanently deleted.",
    });

    setShowDeleteDialog(false); // ✅ close confirmation dialog
    await supabase.auth.signOut();
    navigate("/");
  } catch (err: any) {
    toast({ title: "Error", description: err.message });
      } finally {
    setDeleting(false);
  }
};

  const handleProfileUpdate = () => {
    navigate("/settings");
  };

  const handleAvatarUpdate = () => {
    toast({
      title: "Redirect to Settings",
      description: "Please update your photo in the Settings page.",
    });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
      setShowDialog(false);
    }
  };
const getDaysMessage = () => {
  if (!profileState?.joined_date) return "No join date available.";
  const joinDate = new Date(profileState.joined_date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - joinDate.getTime());
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);

  if (years === 0) {
    return `You are ${days} day${days !== 1 ? "s" : ""} old on the platform. Keep going strong!`;
  }

  const nextAnniversary = years + 1;
  return `You are ${years} year${years > 1 ? "s" : ""} old on the platform. Waiting to celebrate your ${nextAnniversary}${getOrdinalSuffix(nextAnniversary)} anniversary!`;
};

  const getOrdinalSuffix = (i: number) => {
    const j = i % 10,
      k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

// Wait until Supabase finishes loading the user
const [checkingUser, setCheckingUser] = useState(true);

useEffect(() => {
  // Only act after Supabase finishes loading
  if (user === undefined) return; 

  if (!user) {
    // Supabase confirmed no active user
    navigate("/login", { replace: true });
  } else {
    // User is logged in
    const cached = JSON.parse(localStorage.getItem("userProfile") || "null");
    if (cached) setProfileState(cached);
  }

  setCheckingUser(false);
}, [user, navigate]);




// Show loader only if still checking user OR no profile data yet

useEffect(() => {
  const fetchProfile = async () => {
    if (!user) return;
    try {
      const cached = JSON.parse(localStorage.getItem("userProfile") || "null");
      if (cached) setProfileState(cached);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProfileState(data);
        localStorage.setItem("userProfile", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  fetchProfile();
}, [user]);



// Only show loader if we have no cached profile yet
if (!profileState) {
  return <GlobalLoader message="Please be patient, Heartique is aligning your content..." />;
}


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="relative">
                 <Avatar className="h-24 w-24">
  <AvatarImage
    src={profileState?.avatar_url || undefined}
    className="object-cover"
  />
  <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center text-2xl">
    {profileState?.name?.split(" ").map((n) => n[0]).join("") || "??"}
  </AvatarFallback>
</Avatar>

                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={handleAvatarUpdate}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{profileState?.name}</h2>
                      <p className="text-muted-foreground">@{profileState?.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {profileState?.role}
                      </Badge>
                      <Badge variant="outline">
                        {profileState?.subscription || "Free"}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-muted-foreground">{profileState?.bio}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profileState?.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profileState?.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profileState?.county}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profileState?.institution}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Joined{" "}
                          {profileState?.joined_date
                            ? new Date(profileState?.joined_date).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button variant="outline" onClick={handleProfileUpdate}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit My Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Course</label>
                  <p className="font-medium">{profileState?.course}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Block/Class</label>
                  <p className="font-medium">{profileState?.block}</p>
                </div>
                {profileState?.nckNumber && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">NCK Number</label>
                    <p className="font-medium">{profileState?.nckNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Statistics</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <p className="text-lg font-medium text-muted-foreground">{getDaysMessage()}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Update your account settings and preferences in the Settings page.
              </p>
{/* Logout Confirmation */}
<Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
  <DialogTrigger asChild>
    <Button variant="outline">Logout</Button>
  </DialogTrigger>

  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Logout</DialogTitle>
      <DialogDescription>
        Are you sure you want to log out?
      </DialogDescription>
    </DialogHeader>

    <DialogFooter className="mt-4">
      <Button variant="secondary" onClick={() => setShowLogoutDialog(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleLogout}>
        Logout
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
{/* Delete Account Confirmation */}
<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete My Account</Button>
  </DialogTrigger>

  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogDescription>
        This action cannot be undone. Your account and all associated data
        will be permanently deleted.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter className="mt-4">
      <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
  {deleting ? "Deleting..." : "Delete"}
</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

              {/* Password Modal */}
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Change Password</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter and confirm your new password.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-2">
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-4">
                    <Button onClick={handleChangePassword} disabled={passwordLoading}>
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
