"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays,
  Bell,
  Briefcase,
  Users,
  ShieldCheck,
  Construction,
  BookOpen,
  GraduationCap,
  Megaphone,
  Lightbulb,
  Award,
  UserPlus,
  BarChart3,
  FileText,
  MessageSquare,
  Clock,
  Sparkles
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

  // Features coming soon
  const upcomingFeatures = [
    {
      icon: BookOpen,
      title: "CPD (Continuing Professional Development)",
      description: "Access unlimited CPD classes, earn points, and track your professional development progress.",
      badge: "Coming Soon",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    },
    {
      icon: GraduationCap,
      title: "CPD Lessons & Certifications",
      description: "Complete lessons, take assessments, and earn verified certificates for your portfolio.",
      badge: "Coming Soon",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    },
    {
      icon: Lightbulb,
      title: "Daily Knowledge Hacks",
      description: "Curated daily tips, clinical pearls, and evidence-based practice updates to keep you sharp.",
      badge: "Coming Soon",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    },
    {
      icon: Megaphone,
      title: "Post in Nursmart Marketplace",
      description: "Advertise your services, products, or job openings to thousands of nursing professionals.",
      badge: "Coming Soon",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    },
    {
      icon: Users,
      title: "Student Survival Hub",
      description: "Post resources, tips, and opportunities to help students navigate their nursing journey.",
      badge: "Coming Soon",
      badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    },
    {
      icon: Award,
      title: "Professional Recognition",
      description: "Earn badges, awards, and recognition for your contributions to the nursing community.",
      badge: "Coming Soon",
      badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track your impact, engagement, and performance metrics with detailed analytics.",
      badge: "Coming Soon",
      badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
    },
    {
      icon: MessageSquare,
      title: "Peer Collaboration Hub",
      description: "Connect with other staff members, share insights, and collaborate on projects.",
      badge: "Coming Soon",
      badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    },
    {
      icon: FileText,
      title: "Resource Library",
      description: "Access and share professional resources, guidelines, and best practices.",
      badge: "Coming Soon",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400"
    },
    {
      icon: UserPlus,
      title: "Mentorship Programs",
      description: "Connect with mentors or become a mentor to guide the next generation of nurses.",
      badge: "Coming Soon",
      badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
    },
    {
      icon: Clock,
      title: "Shift Management",
      description: "View, manage, and request shifts with advanced scheduling tools.",
      badge: "Coming Soon",
      badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    },
    {
      icon: Sparkles,
      title: "Exclusive Staff Benefits",
      description: "Access special perks, discounts, and resources available only to staff members.",
      badge: "Coming Soon",
      badgeColor: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
    }
  ];

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {profile?.name || "Nurse"} 👩‍⚕️
        </h1>
        <p className="text-white/90">
          Your professional nursing dashboard.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card className="border-0 shadow-sm">
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

        <Card className="border-0 shadow-sm">
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

        <Card className="border-0 shadow-sm">
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

        <Card className="border-0 shadow-sm">
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
      <Card className="border-0 shadow-sm">
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

          <Badge variant="secondary" className="border-0">
            <Users className="h-3 w-3 mr-1" />
            {mentorshipCount}
          </Badge>

        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* 🚧 Staff Portal - Under Development */}
      <div className="relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-purple-50/50 via-indigo-50/50 to-blue-50/50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 p-6 md:p-8 shadow-sm">

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 dark:bg-purple-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Construction className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                Staff Portal Under Development
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                We're building an exclusive Staff Portal with powerful tools to elevate your professional journey.
                Here's what's coming your way:
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {upcomingFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">
                          {feature.title}
                        </h3>
                        <Badge className={`${feature.badgeColor} border-0 text-[10px] font-medium`}>
                          {feature.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Note */}
          <div className="mt-6 p-4 bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg border-0">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/40 rounded-full">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  🚧 We're working hard to bring these features to you!
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80 mt-0.5">
                  Once fully launched, you'll be able to access all these tools and more to elevate your professional journey.
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80 mt-1">
                  <span className="font-bold">Estimated Launch:</span> Coming Soon - Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}