// src/staff-cpd/hooks.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import * as api from "./lib";
import type { Cursor, EnrollmentStatus } from "./lib";
import type {
    ActivityRating, ActivityComment, ActivityBookmark, ActivityMastery,
} from "./lib";
// ─────────────────────────────────────────────────────────────
// Auth helper — every hook needs the current user id
// ─────────────────────────────────────────────────────────────
async function currentUserId(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Not authenticated");
    return data.user.id;
}

// ─────────────────────────────────────────────────────────────
// NURSE HOOKS
// ─────────────────────────────────────────────────────────────

export function useDashboardStats() {
    return useQuery({
        queryKey: ["cpd", "dashboard"],
        queryFn: async () => api.getDashboardStats(await currentUserId()),
        staleTime: 60_000,
    });
}

export function useActivities(filters: { category?: string; difficulty?: string; search?: string } = {}) {
    return useInfiniteQuery({
        queryKey: ["cpd", "activities", filters],
        queryFn: ({ pageParam }) => api.listActivities({ ...filters, cursor: pageParam as Cursor, limit: 20 }),
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useActivityTree(activityId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "activity-tree", activityId],
        queryFn: () => api.getActivityTree(activityId!),
        enabled: !!activityId,
    });
}

export function useMyEnrollment(activityId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "my-enrollment", activityId],
        queryFn: async () => api.getMyEnrollment(activityId!, await currentUserId()),
        enabled: !!activityId,
    });
}

export function useEnroll() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (activityId: string) => api.enrollInActivity(activityId, await currentUserId()),
        onSuccess: (_d, activityId) => {
            qc.invalidateQueries({ queryKey: ["cpd", "my-enrollment", activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activity-tree", activityId] });  // 🆕
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });                 // 🆕
            qc.invalidateQueries({ queryKey: ["cpd", "dashboard"] });
        },
    });
}
export function useMyEnrollments(status?: EnrollmentStatus) {
    return useInfiniteQuery({
        queryKey: ["cpd", "my-enrollments", status],
        queryFn: async ({ pageParam }) => api.listMyEnrollments(await currentUserId(), { cursor: pageParam as Cursor, status, limit: 20 }),
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useProgressForEnrollment(enrollmentId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "progress", enrollmentId],
        queryFn: () => api.listProgressForEnrollment(enrollmentId!),
        enabled: !!enrollmentId,
    });
}

export function useUpsertProgress() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: api.upsertProgress,
        onSuccess: (row) => {
            qc.invalidateQueries({ queryKey: ["cpd", "progress", row.enrollment_id] });
        },
    });
}

export function useAssessmentWithQuestions(assessmentId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "assessment", assessmentId],
        queryFn: () => api.getAssessmentWithQuestions(assessmentId!),
        enabled: !!assessmentId,
    });
}

export function useStartAttempt() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { assessmentId: string; enrollmentId: string }) =>
            api.startAttempt(input.assessmentId, input.enrollmentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cpd"] }),
    });
}

export function useSubmitAttempt() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { attemptId: string; answers: Record<string, any> }) =>
            api.submitAttempt(input.attemptId, input.answers),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["cpd", "dashboard"] });
            qc.invalidateQueries({ queryKey: ["cpd", "my-enrollments"] });
            qc.invalidateQueries({ queryKey: ["cpd", "my-completions"] });
            qc.invalidateQueries({ queryKey: ["cpd", "my-certificates"] });
        },
    });
}

export function useAttemptResults(attemptId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "attempt", attemptId],
        queryFn: () => api.getAttemptResults(attemptId!),
        enabled: !!attemptId,
    });
}

export function useMyCompletions() {
    return useInfiniteQuery({
        queryKey: ["cpd", "my-completions"],
        queryFn: async ({ pageParam }) => api.listMyCompletions(await currentUserId(), { cursor: pageParam as Cursor, limit: 20 }),
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useMyCertificates() {
    return useInfiniteQuery({
        queryKey: ["cpd", "my-certificates"],
        queryFn: async ({ pageParam }) => api.listMyCertificates(await currentUserId(), { cursor: pageParam as Cursor, limit: 20 }),
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useCertificate(id: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "certificate", id],
        queryFn: () => api.getCertificate(id!),
        enabled: !!id,
    });
}

export function useVerifyCertificate(code: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "verify", code],
        queryFn: () => api.verifyCertificate(code!),
        enabled: !!code,
    });
}

// ─────────────────────────────────────────────────────────────
// ADMIN HOOKS
// ─────────────────────────────────────────────────────────────

export function useAdminActivities(opts: { status?: string; cursor?: Cursor } = {}) {
    return useInfiniteQuery({
        queryKey: ["cpd", "admin", "activities", opts.status],
        queryFn: async ({ pageParam }) => {
            const limit = 25;
            const cursor = pageParam as Cursor;
            let q = supabase
                .from("cpd_activities")
                .select("*")
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);
            if (opts.status) q = q.eq("status", opts.status);
            if (cursor) {
                const [ts, id] = cursor.split("|");
                q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
            }
            const { data, error } = await q;
            if (error) throw error;
            const rows = (data ?? []) as any[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return { items, nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null };
        },
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useAdminActivity(activityId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "admin", "activity", activityId],
        queryFn: async () => {
            const tree = await api.getActivityTree(activityId!);
            return tree;
        },
        enabled: !!activityId,
    });
}

export function useCreateActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (draft: Partial<api.CpdActivity>) => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activities")
                .insert({ ...draft, created_by: uid, status: "draft" })
                .select("*").single();
            if (error) throw error;
            return data as api.CpdActivity;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cpd", "admin", "activities"] }),
    });
}

export function useUpdateActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, patch }: { id: string; patch: Partial<api.CpdActivity> }) => {
            const { data, error } = await supabase
                .from("cpd_activities").update(patch).eq("id", id).select("*").single();
            if (error) throw error;
            return data as api.CpdActivity;
        },
        onSuccess: (d) => {
            qc.invalidateQueries({ queryKey: ["cpd", "admin", "activity", d.id] });
            qc.invalidateQueries({ queryKey: ["cpd", "admin", "activities"] });
        },
    });
}

export function usePublishActivity() {
    const qc = useQueryClient();
    return useMutation({
        // Server-side publish — validates + sets status + published_at atomically
        mutationFn: async (activityId: string) => {
            const { data, error } = await supabase.rpc("cpd_publish_activity", { p_activity_id: activityId });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["cpd", "admin"] });
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });
        },
    });
}

export function useCreateModule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { activity_id: string; title: string; position: number; estimated_minutes?: number }) => {
            const { data, error } = await supabase.from("cpd_modules").insert(input).select("*").single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cpd", "admin", "activity", v.activity_id] }),
    });
}

export function useDeleteModule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, activityId }: { id: string; activityId: string }) => {
            const { error } = await supabase.from("cpd_modules").delete().eq("id", id);
            if (error) throw error;
            return activityId;
        },
        onSuccess: (activityId) => qc.invalidateQueries({ queryKey: ["cpd", "admin", "activity", activityId] }),
    });
}

export function useCreateContentItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: Partial<api.CpdContentItem> & { module_id: string; activity_id: string }) => {
            // Validation before insert
            const check = api.validateContentItem(input as any);
            if (!check.ok) throw new Error(check.reason || "Invalid content item");
            const merged = { ...input, ...(check.normalized ?? {}) };
            delete (merged as any).activity_id;
            const { data, error } = await supabase.from("cpd_content_items").insert(merged).select("*").single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cpd", "admin", "activity", v.activity_id] }),
    });
}

export function useDeleteContentItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, activityId }: { id: string; activityId: string }) => {
            const { error } = await supabase.from("cpd_content_items").delete().eq("id", id);
            if (error) throw error;
            return activityId;
        },
        onSuccess: (activityId) => qc.invalidateQueries({ queryKey: ["cpd", "admin", "activity", activityId] }),
    });
}

export function useAdminQuestions(opts: { search?: string; type?: string } = {}) {
    return useInfiniteQuery({
        queryKey: ["cpd", "admin", "questions", opts],
        queryFn: async ({ pageParam }) => {
            const limit = 25;
            const cursor = pageParam as Cursor;
            let q = supabase
                .from("cpd_questions")
                .select("*")
                .eq("status", "active")
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);
            if (opts.type) q = q.eq("question_type", opts.type);
            if (opts.search) q = q.ilike("question", `%${opts.search}%`);
            if (cursor) {
                const [ts, id] = cursor.split("|");
                q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
            }
            const { data, error } = await q;
            if (error) throw error;
            const rows = (data ?? []) as any[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return { items, nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null };
        },
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useCreateQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            question: string; question_type: api.QuestionType;
            explanation?: string; options?: { option_text: string; is_correct: boolean }[];
        }) => {
            const uid = await currentUserId();
            const { data: q, error: qe } = await supabase
                .from("cpd_questions")
                .insert({ question: input.question, question_type: input.question_type, explanation: input.explanation, created_by: uid })
                .select("*").single();
            if (qe) throw qe;

            if (input.options?.length) {
                const opts = input.options.map((o, i) => ({
                    question_id: q.id, option_text: o.option_text, is_correct: o.is_correct, position: i,
                }));
                const { error: oe } = await supabase.from("cpd_question_options").insert(opts);
                if (oe) throw oe;
            }
            return q as api.CpdQuestion;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cpd", "admin", "questions"] }),
    });
}

export function useAttachQuestionToAssessment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { assessment_id: string; question_id: string; position: number; points?: number }) => {
            const { data, error } = await supabase.from("cpd_assessment_questions").insert(input).select("*").single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cpd", "admin"] }),
    });
}

export function useAdminCompletions(opts: { status?: string } = {}) {
    return useInfiniteQuery({
        queryKey: ["cpd", "admin", "completions", opts.status],
        queryFn: async ({ pageParam }) => {
            const limit = 25;
            const cursor = pageParam as Cursor;
            let q = supabase
                .from("cpd_completions")
                .select("*, activity:cpd_activities(title), nurse:profiles(name,email)")
                .order("completed_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);
            if (opts.status) q = q.eq("completion_status", opts.status);
            if (cursor) {
                const [ts, id] = cursor.split("|");
                q = q.or(`completed_at.lt.${ts},and(completed_at.eq.${ts},id.lt.${id})`);
            }
            const { data, error } = await q;
            if (error) throw error;
            const rows = (data ?? []) as any[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return { items, nextCursor: hasMore && last ? `${last.completed_at}|${last.id}` : null };
        },
        initialPageParam: null as Cursor,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useAdminPeriods() {
    return useQuery({
        queryKey: ["cpd", "admin", "periods"],
        queryFn: async () => {
            const { data, error } = await supabase.from("cpd_periods").select("*").order("start_date", { ascending: false });
            if (error) throw error;
            return (data ?? []) as api.CpdPeriod[];
        },
    });
}

export function useCreatePeriod() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { name: string; start_date: string; end_date: string; status?: string }) => {
            const { data, error } = await supabase.from("cpd_periods").insert(input).select("*").single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cpd", "admin", "periods"] }),
    });
}

// ─────────────────────────────────────────────────────────────
// CONTRIBUTOR VERIFICATION HOOKS
// ─────────────────────────────────────────────────────────────

export function useContributorVerifications(status?: "submitted" | "approved" | "rejected") {
    return useQuery({
        queryKey: ["cpd", "contributor-verifications", status],
        queryFn: async () => {
            let q = supabase
                .from("contributor_verifications")
                .select(`
                    *,
                    profile:profiles!contributor_verifications_user_id_fkey (
                        user_id, name, email, nck_number, years_experience, workplace, specialization
                    )
                `)
                .order("submitted_at", { ascending: false });
            if (status) q = q.eq("status", status);
            const { data, error } = await q;
            if (error) throw error;
            return data ?? [];
        },
    });
}

export function useMyContributorVerification() {
    return useQuery({
        queryKey: ["cpd", "my-contributor-verification"],
        queryFn: async () => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("contributor_verifications")
                .select("*")
                .eq("user_id", uid)
                .order("submitted_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });
}

export function useSubmitContributorApplication() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            nck_license_url: string;
            employer_letter_url?: string | null;
            cv_url: string;
            additional_notes?: string | null;
        }) => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("contributor_verifications")
                .insert({
                    user_id: uid,
                    nck_license_url: input.nck_license_url,
                    employer_letter_url: input.employer_letter_url || null,
                    cv_url: input.cv_url,
                    additional_notes: input.additional_notes || null,
                    status: "submitted",
                })
                .select("*")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["cpd", "my-contributor-verification"] });
            qc.invalidateQueries({ queryKey: ["cpd", "contributor-verifications"] });
        },
    });
}

export function useReviewContributorApplication() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            verificationId: string;
            userId: string;
            action: "approve" | "reject";
            tier?: "contributor" | "senior_contributor";
            reviewNotes?: string;
        }) => {
            const reviewerId = await currentUserId();

            // 1. Update verification row
            const { error: vErr } = await supabase
                .from("contributor_verifications")
                .update({
                    status: input.action === "approve" ? "approved" : "rejected",
                    reviewer_id: reviewerId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: input.reviewNotes || null,
                })
                .eq("id", input.verificationId);
            if (vErr) throw vErr;

            // 2. If approved, update profile
            if (input.action === "approve") {
                const { error: pErr } = await supabase
                    .from("profiles")
                    .update({
                        is_verified_contributor: true,
                        contributor_tier: input.tier || "contributor",
                        contributor_approved_at: new Date().toISOString(),
                        contributor_approved_by: reviewerId,
                        nck_license_verified: true,
                    })
                    .eq("user_id", input.userId);
                if (pErr) throw pErr;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["cpd", "contributor-verifications"] });
            qc.invalidateQueries({ queryKey: ["cpd", "admin"] });
        },
    });
}
// ─────────────────────────────────────────────────────────────
// SOCIAL HOOKS — ratings, comments, bookmarks, mastery
// ─────────────────────────────────────────────────────────────


// ─── Ratings ──────────────────────────────────────────────────

export function useMyRating(activityId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "my-rating", activityId],
        enabled: !!activityId,
        staleTime: 30_000,
        queryFn: async () => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activity_ratings")
                .select("*")
                .eq("activity_id", activityId!)
                .eq("user_id", uid)
                .maybeSingle();
            if (error) throw error;
            return data as ActivityRating | null;
        },
    });
}

export function useRecentRatings(activityId: string | undefined, limit = 5) {
    return useQuery({
        queryKey: ["cpd", "recent-ratings", activityId, limit],
        enabled: !!activityId,
        staleTime: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("cpd_activity_ratings")
                .select("*, user:profiles(name, avatar_url)")
                .eq("activity_id", activityId!)
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error) throw error;
            return (data ?? []) as ActivityRating[];
        },
    });
}

export function useUpsertRating() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { activityId: string; rating: number; comment?: string | null }) => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activity_ratings")
                .upsert(
                    {
                        activity_id: input.activityId,
                        user_id: uid,
                        rating: input.rating,
                        comment: input.comment?.trim() || null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "activity_id,user_id" }
                )
                .select("*")
                .single();
            if (error) throw error;
            return data as ActivityRating;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ["cpd", "my-rating", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "recent-ratings", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activity-tree", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });
        },
    });
}

// ─── Comments ─────────────────────────────────────────────────

export function useActivityComments(activityId: string | undefined) {
    return useInfiniteQuery({
        queryKey: ["cpd", "comments", activityId],
        enabled: !!activityId,
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor,
        queryFn: async ({ pageParam }) => {
            const limit = 20;
            const cur = pageParam ? (pageParam as string).split("|") : null;

            let q = supabase
                .from("cpd_activity_comments")
                .select("*, user:profiles(name, avatar_url)")
                .eq("activity_id", activityId!)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);

            if (cur) {
                const [ts, id] = cur;
                q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
            }

            const { data, error } = await q;
            if (error) throw error;

            const rows = (data ?? []) as ActivityComment[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return {
                items,
                nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null,
            };
        },
    });
}

export function usePostComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { activityId: string; body: string; parentId?: string | null }) => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activity_comments")
                .insert({
                    activity_id: input.activityId,
                    user_id: uid,
                    body: input.body.trim(),
                    parent_id: input.parentId ?? null,
                })
                .select("*, user:profiles(name, avatar_url)")
                .single();
            if (error) throw error;
            return data as ActivityComment;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ["cpd", "comments", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activity-tree", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });
        },
    });
}

export function useDeleteComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { commentId: string; activityId: string }) => {
            const uid = await currentUserId();
            const { error } = await supabase
                .from("cpd_activity_comments")
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .eq("id", input.commentId)
                .eq("user_id", uid);
            if (error) throw error;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ["cpd", "comments", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activity-tree", v.activityId] });
        },
    });
}

// ─── Bookmarks ────────────────────────────────────────────────

export function useMyBookmark(activityId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "my-bookmark", activityId],
        enabled: !!activityId,
        staleTime: 30_000,
        queryFn: async () => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activity_bookmarks")
                .select("*")
                .eq("activity_id", activityId!)
                .eq("user_id", uid)
                .maybeSingle();
            if (error) throw error;
            return data as ActivityBookmark | null;
        },
    });
}

export function useToggleBookmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { activityId: string; isBookmarked: boolean }) => {
            const uid = await currentUserId();
            if (input.isBookmarked) {
                const { error } = await supabase
                    .from("cpd_activity_bookmarks")
                    .delete()
                    .eq("activity_id", input.activityId)
                    .eq("user_id", uid);
                if (error) throw error;
                return { bookmarked: false };
            }
            const { error } = await supabase
                .from("cpd_activity_bookmarks")
                .insert({ activity_id: input.activityId, user_id: uid });
            if (error) throw error;
            return { bookmarked: true };
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ["cpd", "my-bookmark", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activity-tree", v.activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "my-bookmarks"] });
        },
    });
}

export function useMyBookmarks() {
    return useInfiniteQuery({
        queryKey: ["cpd", "my-bookmarks"],
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor,
        queryFn: async ({ pageParam }) => {
            const uid = await currentUserId();
            const limit = 20;
            const cur = pageParam ? (pageParam as string).split("|") : null;

            let q = supabase
                .from("cpd_activity_bookmarks")
                .select("*, activity:cpd_activities(*)")
                .eq("user_id", uid)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);

            if (cur) {
                const [ts, id] = cur;
                q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
            }

            const { data, error } = await q;
            if (error) throw error;

            const rows = (data ?? []) as (ActivityBookmark & { activity: any })[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return {
                items,
                nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null,
            };
        },
    });
}

// ─── Mastery ──────────────────────────────────────────────────

export function useMyMastery(activityId: string | undefined) {
    return useQuery({
        queryKey: ["cpd", "my-mastery", activityId],
        enabled: !!activityId,
        staleTime: 60_000,
        queryFn: async () => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activity_mastery")
                .select("*")
                .eq("activity_id", activityId!)
                .eq("user_id", uid)
                .maybeSingle();
            if (error) throw error;
            return data as ActivityMastery | null;
        },
    });
}

export function useMarkMastered() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (activityId: string) => {
            const uid = await currentUserId();
            const { data, error } = await supabase
                .from("cpd_activity_mastery")
                .upsert(
                    { activity_id: activityId, user_id: uid },
                    { onConflict: "activity_id,user_id" }
                )
                .select("*")
                .single();
            if (error) throw error;
            return data as ActivityMastery;
        },
        onSuccess: (_d, activityId) => {
            qc.invalidateQueries({ queryKey: ["cpd", "my-mastery", activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activity-tree", activityId] });
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });
        },
    });
}