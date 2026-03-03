"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays,
  Bell,
  Briefcase,
  Users,
  ShieldCheck
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

export default function StaffDashboard() {

  const [profile, setProfile] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [shiftCount, setShiftCount] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [mentorshipCount, setMentorshipCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);

      // License
      const { data: licenseData } = await supabase
        .from("staff_licenses")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      setLicense(licenseData);

      // Upcoming shifts
      const { data: shifts } = await supabase
        .from("staff_shifts")
        .select("id")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString());

      setShiftCount(shifts?.length || 0);

      // Notifications
      const { data: notif } = await supabase
        .from("staff_notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_read", false);

      setNotifications(notif?.length || 0);

      // Verified jobs available
      const { data: jobs } = await supabase
        .from("staff_jobs")
        .select("id")
        .eq("verified", true)
        .eq("is_active", true);

      setJobCount(jobs?.length || 0);

      // Mentorship
      const { data: mentorship } = await supabase
        .from("staff_mentorship_requests")
        .select("id")
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .eq("status", "active");

      setMentorshipCount(mentorship?.length || 0);
    };

    loadDashboard();
  }, []);

  const daysUntilExpiry = license
    ? Math.ceil(
      (new Date(license.expiry_date).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    )
    : null;

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="bg-gradient-care rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {profile?.name || "Nurse"} 👩‍⚕️
        </h1>
        <p className="text-white/90">
          Your professional nursing dashboard.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              License Status
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {license ? "Active" : "Missing"}
            </div>
            {daysUntilExpiry && (
              <p className="text-xs text-muted-foreground">
                {daysUntilExpiry} days until renewal
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Shifts
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduled shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Job Opportunities
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Verified openings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications}
            </div>
            <p className="text-xs text-muted-foreground">
              Unread alerts
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Mentorship Section */}
      <Card>
        <CardHeader>
          <CardTitle>Mentorship</CardTitle>
          <CardDescription>
            Connect with experienced nurses or mentor new professionals
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between">

          <div>
            <p className="text-lg font-semibold">
              Active Mentorships
            </p>

            <p className="text-sm text-muted-foreground">
              Grow your professional network
            </p>
          </div>

          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            {mentorshipCount}
          </Badge>

        </CardContent>
      </Card>

    </div>
  );
}