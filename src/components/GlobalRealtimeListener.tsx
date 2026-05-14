import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useQueryClient } from "@tanstack/react-query"
import { playSound } from "@/lib/soundManager"
import { toast } from "sonner"

export default function GlobalRealtimeListener() {
    const queryClient = useQueryClient()
    const userIdRef = useRef<string | null>(null)
    const lastEventRef = useRef<string | null>(null)

    useEffect(() => {
        // Get user ONCE
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            userIdRef.current = user?.id || null
        }

        loadUser()

        const channel = supabase
            .channel("global-db-listener")
            .on(
                "postgres_changes",
                { event: "*", schema: "public" },
                (payload) => {
                    // 🔄 Invalidate only affected table
                    if (payload.table) {
                        queryClient.invalidateQueries([payload.table])
                    }

                    const currentUserId = userIdRef.current
                    if (!currentUserId) return

                    // Prevent duplicate rapid firing
                    const eventKey = `${payload.table}-${payload.eventType}-${payload.commit_timestamp}`
                    if (lastEventRef.current === eventKey) return
                    lastEventRef.current = eventKey

                    // 🔔 USER NOTIFICATIONS
                    if (
                        payload.table === "notifications" &&
                        payload.eventType === "INSERT" &&
                        payload.new?.user_id === currentUserId
                    ) {
                        playSound("notification")

                        toast.success("New Notification", {
                            description:
                                payload.new?.title || "You have received a new update.",
                        })
                    }

                    // 📢 ANNOUNCEMENTS (global)
                    if (
                        payload.table === "announcements" &&
                        payload.eventType === "INSERT"
                    ) {
                        playSound("alert-sound")

                        toast("s New Announcement Posted", {
                            description:
                                payload.new?.title || "Check the announcements page.",
                        })
                    }

                    // 🛒 MARKET MESSAGE (example user-specific)
                    if (
                        payload.table === "market_messages" &&
                        payload.eventType === "INSERT" &&
                        payload.new?.receiver_id === currentUserId
                    ) {
                        playSound("notification")

                        toast.info("New Message About Your Listing", {
                            description: "Someone contacted you.",
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient])

    return null
}