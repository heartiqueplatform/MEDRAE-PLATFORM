"use client";
import { Calendar as CalendarIcon, Tag, AlertCircle, AlignLeft, Type, CalendarDays, Clock, MapPin, Bell, Share2, Trash2, Info, MoreHorizontal, Activity, ChevronRight, CheckCircle2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";


export function Calendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      // Only use temp cache here, because userId is not yet known
      const tempCache = localStorage.getItem("cachedEvents_temp");
      return tempCache ? JSON.parse(tempCache) : [];
    }
    return [];
  });


  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    time: "",
    type: "exam",
    priority: "high",
  });

  useEffect(() => {
    async function getUserAndEvents() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;

      const id = data.user.id;
      setUserId(id);

      // Migrate temp cache to user-specific cache
      const tempCache = localStorage.getItem("cachedEvents_temp");
      if (tempCache) {
        localStorage.setItem(`cachedEvents_${id}`, tempCache);
        localStorage.removeItem("cachedEvents_temp");
        setEvents(JSON.parse(tempCache)); // instantly show
      }

      // Fetch fresh data
      fetchEvents(id);
    }

    getUserAndEvents();
  }, []);


  // 🔴 Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("calendar_events_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `user_id=eq.${userId}` },
        (payload) => {
          setEvents((prev) => {
            let updated = [...prev];

            if (payload.eventType === "INSERT") {
              updated = [payload.new, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              updated = prev.map((e) => (e.id === payload.new.id ? payload.new : e));
            }
            if (payload.eventType === "DELETE") {
              updated = prev.filter((e) => e.id !== payload.old.id);
            }

            // ✅ Update cache
            localStorage.setItem(`cachedEvents_${userId}`, JSON.stringify(updated));
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);


  async function fetchEvents(user_id: string) {
    const cachedKey = `cachedEvents_${user_id}`;
    const cachedEvents = localStorage.getItem(cachedKey);
    if (cachedEvents) setEvents(JSON.parse(cachedEvents)); // instant load

    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, description, start_time, type, priority")
      .eq("user_id", user_id)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setEvents(data);
      localStorage.setItem(cachedKey, JSON.stringify(data));
    }
  }



  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!selectedDate || !form.title || !form.time || !userId) {
      toast({ title: "Please fill in all fields." });
      return;
    }

    const [hours, minutes] = form.time.split(":").map(Number);
    const datetime = new Date(selectedDate);
    datetime.setHours(hours);
    datetime.setMinutes(minutes);
    datetime.setSeconds(0);
    datetime.setMilliseconds(0);

    const { error } = await supabase.from("calendar_events").insert([
      {
        title: form.title,
        description: form.description,
        start_time: datetime.toISOString(),
        type: form.type,
        priority: form.priority,
        user_id: userId,
      },
    ]);

    if (!error) {
      toast({ title: "Event added!" });
      setShowModal(false);
      setForm({ title: "", description: "", time: "", type: "exam", priority: "high" });
      // realtime will refresh automatically
    } else {
      toast({ title: "Error saving event." });
      console.error(error);
    }
  }

  // New delete handler function
  async function handleDelete(eventId: string) {
    if (!userId) return;

    const confirmed = confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId);

    if (!error) {
      toast({ title: "Event deleted!" });
      // No manual fetch needed — realtime handles update
    } else {
      toast({ title: "Error deleting event." });
      console.error(error);
    }
  }

  const typeColors: Record<string, string> = {
    exam: "bg-red-500 text-white",
    assignment: "bg-blue-500 text-white",
    practical: "bg-green-600 text-white",
    revision: "bg-purple-600 text-white",
    graduation: "bg-indigo-600 text-white",
    meeting: "bg-pink-600 text-white",
    project: "bg-yellow-600 text-black",
    event: "bg-orange-500 text-white",
    others: "bg-gray-500 text-white",
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  const eventDates = new Set(events.map((e) => new Date(e.start_time).toDateString()));

  const getDayColor = (date: Date) => {
    const event = events.find(
      (e) => new Date(e.start_time).toDateString() === date.toDateString()
    );
    return event ? typeColors[event.type] : "";
  };

  return (
    <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)]  ">
      <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6">

        <div className="space-y-6">
          {/* Header Section with Nurse/Medical Background */}
          <div className="relative overflow-hidden rounded-2xl border-0 bg-background p-8 shadow-sm">
            {/* Subtle Medical Background Image */}
            <div
              className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1584982324572-755d14c59ff0?auto=format&fit=crop&q=80&w=1000')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/90 to-transparent" />

            <div className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-0 px-3 py-1">
                    <Activity className="h-3 w-3 mr-1" />
                    Medical Portal
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Assessment Calendar
                </h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Manage your clinical rotations, exams, and practical assessments in one unified schedule.
                </p>
              </div>

              {/* Quick Stats (The "Smart" part) */}
              <div className="flex gap-2">
                <div className="bg-background/50 backdrop-blur-sm border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Tasks</p>
                    <p className="text-2xl font-bold">{events.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-12">
            {/* Calendar Card - Spans 7 columns */}
            <Card className="md:col-span-7 border-muted/40 shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Schedule Overview
                    </CardTitle>
                    <CardDescription>Select a date to manage your workload</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    handleDateSelect(d);
                  }}
                  className="p-0 flex justify-center"
                  // Professional "Smart" Modifiers
                  modifiers={{
                    eventDay: (d) => eventDates.has(d.toDateString()),
                  }}
                  modifiersClassNames={{
                    eventDay: `relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full font-bold text-primary`,
                  }}
                  classNames={{
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground font-extrabold ring-2 ring-primary/20",
                  }}
                />
              </CardContent>
            </Card>

            {/* Today's Focus Card - Spans 5 columns (The "Smart" sidebar) */}
            <Card className="md:col-span-5 border-muted/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Focus for Today
                </CardTitle>
                <CardDescription>{new Date().toDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {events.filter(e => new Date(e.start_time).toDateString() === new Date().toDateString()).length > 0 ? (
                  events
                    .filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())
                    .map(event => (
                      <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                        <div className={`h-10 w-1 bg-primary rounded-full ${getPriorityColor(event.priority)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl border-muted">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No assessments scheduled<br />for today.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/*   </div>Upcoming Assessments */}


          <Card className="w-full shadow-sm border-muted/40 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight">Upcoming Assessments</CardTitle>
                  <CardDescription className="text-sm">
                    {events.length > 0
                      ? `You have ${events.length} assessments scheduled`
                      : "No upcoming assessments found"}
                  </CardDescription>
                </div>
                <CalendarIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </CardHeader>

            <CardContent className="grid gap-4">
              {events.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground text-sm">No tasks on the horizon.</p>
                </div>
              )}

              {events.map((event) => (
                <div
                  key={event.id}
                  className="group relative flex flex-col space-y-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20"
                >
                  {/* Top Row: Title and Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${getPriorityColor(event.priority)} animate-pulse`} />
                        <h3 className="font-semibold leading-none tracking-tight">{event.title}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(event.start_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            {event.description || "Not Specified"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className={`${typeColors[event.type] || "bg-gray-100"} font-medium px-2.5 py-0.5 rounded-full border-none`}
                    >
                      {event.type}
                    </Badge>
                  </div>

                  <Separator className="opacity-50" />

                  {/* Bottom Row: Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setShowReminder(true)}
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Set Reminder</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Share Assessment</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={showDetailsId === event.id ? "secondary" : "ghost"}
                        onClick={() => setShowDetailsId(showDetailsId === event.id ? null : event.id)}
                        className="h-8 text-xs font-medium gap-1.5"
                      >
                        <Info className="h-3.5 w-3.5" />
                        {showDetailsId === event.id ? "Hide Details" : "Details"}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(event.id)}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Section */}
                  {showDetailsId === event.id && (
                    <div className="mt-2 grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                        <p className="text-foreground">{event.description || "No description provided."}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Date</p>
                        <p className="text-foreground">{new Date(event.start_time).toDateString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</p>
                        <p className="capitalize text-foreground">{event.priority}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Time</p>
                        <p className="text-foreground">{new Date(event.start_time).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>


        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[425px] border-muted/40 shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <span>Add Assessment</span>
              </DialogTitle>
              <DialogDescription>
                Schedule a new task for {selectedDate?.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* Title Field */}
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <Type className="h-3.5 w-3.5 text-muted-foreground" />
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Final Mathematics Exam"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-background focus-visible:ring-primary"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="desc" className="flex items-center gap-2">
                  <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  Description
                </Label>
                <Textarea
                  id="desc"
                  placeholder="Topics to cover, location, or notes..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[80px] bg-background resize-none focus-visible:ring-primary"
                />
              </div>

              {/* Row: Time and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="bg-background focus-visible:ring-primary block w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    Type
                  </Label>
                  <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="practical">Practical</option>
                    <option value="project">Project</option>
                    <option value="event">Event</option>
                    <option value="revision">Revision</option>
                    <option value="graduation">Graduation</option>
                    <option value="meeting">Meeting</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>

              {/* Priority Field */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Priority Level
                </Label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reminder Options Dialog */}
        <Dialog open={showReminder} onOpenChange={setShowReminder}>
          <DialogContent>
            <DialogTitle>Reminder Options</DialogTitle>
            <DialogDescription>
              Choose how you'd like to be reminded (coming soon)
            </DialogDescription>
            <Button variant="outline" className="w-full">
              SMS Reminder (Coming Soon)
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Email Reminder (Planned)
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setShowReminder(false)}>
              Close
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  );
}
