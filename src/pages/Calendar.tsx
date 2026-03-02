"use client";

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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { CalendarDays, Clock, MapPin, Bell, Share2, Info, Trash2 } from "lucide-react";

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
      <div className="w-full max-w-3xl space-y-2 px-3 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
            Assessment Calendar
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your upcoming assessments and important dates
          </p>
        </div>
        <div className="grid gap-2 grid-cols-1 w-full">
          {/* Calendar */}
          <Card className="w-full border-0 overflow-hidden">

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendar
              </CardTitle>
              <CardDescription>Click a date to add a new assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  handleDateSelect(d);
                }}
                className="rounded-md border"
                modifiers={{
                  eventDay: (d) => eventDates.has(d.toDateString()),
                }}
                modifiersClassNames={{
                  eventDay: "rounded-full ring-2 ring-offset-1",
                }}
                modifiersStyles={{
                  eventDay: (date) => {
                    const colorClass = getDayColor(date);
                    return { className: colorClass };
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Upcoming Assessments */}

          <Card className="w-full border-0 overflow-hidden">

            <CardHeader>
              <CardTitle>Upcoming Assessments</CardTitle>
              <CardDescription>
                {events.length > 0
                  ? `Next ${events.length} assessments scheduled`
                  : "No upcoming assessments"}
              </CardDescription>

            </CardHeader>
            <CardContent className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(event.start_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.description || "Not Specified"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${getPriorityColor(event.priority)}`}
                      />
                      <Badge className={typeColors[event.type] || "bg-gray-500 text-white"}>
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Left stack: Remind Me + Share */}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"

                        onClick={() => setShowReminder(true)}
                        variant="ghost"
                        className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Bell className="h-3 w-3" />
                      </Button>
                      <Button size="sm"
                        variant="ghost"
                        className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Share2 className="h-3 w-3" />

                      </Button>
                    </div>

                    {/* Right stack: View Details + Delete */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:ml-auto">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setShowDetailsId(showDetailsId === event.id ? null : event.id)
                        }
                      >
                        <Info className="h-3 w-3" />
                        info
                      </Button>
                      <Button
                        size="sm"

                        onClick={() => handleDelete(event.id)}
                        variant="ghost"
                        className="mt-3 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {showDetailsId === event.id && (
                    <div className="text-sm mt-2 border-t pt-2 text-muted-foreground">
                      <p>
                        <strong>Description:</strong> {event.description || "N/A"}
                      </p>
                      <p>
                        <strong>Type:</strong> {event.type}
                      </p>
                      <p>
                        <strong>Priority:</strong> {event.priority}
                      </p>
                      <p>
                        <strong>Date:</strong> {new Date(event.start_time).toDateString()}
                      </p>
                      <p>
                        <strong>Time:</strong>{" "}
                        {new Date(event.start_time).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Add Event Dialog */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogTitle className="text-lg font-semibold">
              Add Event for {selectedDate?.toDateString()}
            </DialogTitle>
            <DialogDescription>Fill in the event details below</DialogDescription>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full border p-2 rounded text-black"
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

            <div className="space-y-2">
              <Label>Priority</Label>
              <select
                className="w-full border p-2 rounded text-black"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <Button onClick={handleSubmit} className="w-full">
              Submit
            </Button>
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
    </div>
  );
}
