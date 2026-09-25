// src/staff-cpd/hooks.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import * as api from "./lib";
import type { Cursor, EnrollmentStatus } from "./lib";

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