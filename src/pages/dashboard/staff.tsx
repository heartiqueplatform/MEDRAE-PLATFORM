import {
  Video, Eye, PenTool, Heart,
  Network, CalendarDays, Briefcase,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StaffDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-care rounded-xl p-6 text-green">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, Nurse Mary! 👩‍⚕️
        </h1>
        <p className="text-white/90">
          Share your expertise and mentor the next generation of healthcare professionals.
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Videos Posted</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">+4 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,847</div>
            <p className="text-xs text-muted-foreground">+1,203 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Articles Written</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Community Impact</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.9/5</div>
            <p className="text-xs text-muted-foreground">From 156 likes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Staff Activity</CardTitle>
              <CardDescription>Your latest contributions to the community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { action: "Posted Video: Managing ICU Pressure Ulcers", time: "3 hours ago", stat: "45 views" },
                { action: "Shared Job Opportunity: Staff Nurse at KNH", time: "1 day ago", stat: "12 applications" },
                { action: "Published Article: New Grad Nurse Tips", time: "2 days ago", stat: "89 reads" },
                { action: "Added Event: CPD Seminar on Patient Safety", time: "3 days ago", stat: "23 RSVPs" }
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{activity.stat}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Actions + Trending */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Video className="mr-2 h-4 w-4" />
                Post New Video
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <PenTool className="mr-2 h-4 w-4" />
                Write Article
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Briefcase className="mr-2 h-4 w-4" />
                Share Job Opening
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CalendarDays className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trending in Community</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { topic: "Medication Safety Tips", stat: "156 interactions" },
                { topic: "Mental Health Support", stat: "98 interactions" },
                { topic: "Career Development", stat: "87 interactions" },
                { topic: "Clinical Protocols", stat: "76 interactions" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">{item.stat}</p>
                  </div>
                  <Badge variant="secondary">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Hot
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
