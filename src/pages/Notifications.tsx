"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Bell,
  Clock,
  MessageSquare,
  Calendar,
  Award,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      fetchNotifications(user.id);
    }
  };

  const fetchNotifications = async (uid: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  // 🔹 Mark one as read
  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (userId) fetchNotifications(userId);
  };

  // 🔹 Mark all as read
  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    fetchNotifications(userId);
  };

  const getIconComponent = (type: string) => {
    switch (type) {
      case "quiz":
        return Award;
      case "chat":
        return MessageSquare;
      case "assignment":
      case "calendar":
        return Calendar;
      case "payment":
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          <Badge variant="destructive" className="rounded-full">
            {notifications.filter((n) => !n.is_read).length}
          </Badge>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {notifications.map((notification: any) => {
          const IconComponent = getIconComponent(notification.type);
          return (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 border-l-4 ${
                notification.is_read
                  ? "border-green-500 bg-green-50"
                  : "border-blue-500 bg-blue-50"
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-full ${
                      notification.type === "quiz"
                        ? "bg-green-100 text-green-600"
                        : notification.type === "chat"
                        ? "bg-blue-100 text-blue-600"
                        : notification.type === "calendar"
                        ? "bg-orange-100 text-orange-600"
                        : notification.type === "payment"
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-medium ${
                          notification.is_read
                            ? "text-green-700"
                            : "text-blue-700"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              You're all caught up! New notifications will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
