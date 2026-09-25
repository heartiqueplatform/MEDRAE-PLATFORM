// src/staff-cpd/lib/admin-hooks.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import * as admin from "./admin-api";
import * as coreApi from "../lib";
import type { CpdActivity, CpdPeriod, QuestionType } from "../lib";

const ADMIN_KEY = ["cpd", "admin"];

// ─────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────
export function useAdminActivities(status?: string) {
    return useInfiniteQuery({
        queryKey: [...ADMIN_KEY, "activities", status],
        queryFn: async ({ pageParam }) => {
            const { supabase } = await import("@/lib/supabaseClient");
            const limit = 25;
            let q = supabase
                .from("cpd_activities").select("*")
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);
            if (status) q = q.eq("status", status);
            if (pageParam) {
                const [ts, id] = (pageParam as string).split("|");
                q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
            }
            const { data, error } = await q;
            if (error) throw error;
            const rows = (data ?? []) as CpdActivity[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return { items, nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null };
        },
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor,
    });
}
// ─────────────────────────────────────────────────────────────
// SINGLE ACTIVITY (full tree: modules + content + assessments)
// ─────────────────────────────────────────────────────────────
export function useAdminActivity(activityId: string | undefined) {
    return useQuery({
        queryKey: [...ADMIN_KEY, "activity", activityId],
        queryFn: () => coreApi.getActivityTree(activityId!),
        enabled: !!activityId,
    });
}
export function useCreateActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (draft: Partial<CpdActivity>) => admin.adminCreateActivity(draft),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activities"] }),
    });
}

export function useUpdateActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; patch: Partial<CpdActivity> }) => admin.adminUpdateActivity(v.id, v.patch),
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.id] });
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activities"] });
        },
    });
}
export function useRemoveActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => admin.adminRemoveActivity(id),
        onSuccess: (_res, id) => {
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activities"] });
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", id] });
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });   // public catalog
            qc.invalidateQueries({ queryKey: ["cpd", "dashboard"] });
        },
    });
}
export function useDeleteActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => admin.adminDeleteActivity(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activities"] }),
    });
}

export function usePublishActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => admin.adminPublishActivity(id),
        onSuccess: (_d, id) => {
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", id] });
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activities"] });
        },
    });
}

// ─────────────────────────────────────────────────────────────
// MODULES / CONTENT
// ─────────────────────────────────────────────────────────────
export function useCreateModule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { activity_id: string; title: string; position: number; estimated_minutes?: number }) =>
            admin.adminCreateModule(input),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useUpdateModule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; activity_id: string; patch: any }) => admin.adminUpdateModule(v.id, v.patch),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useDeleteModule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; activity_id: string }) => admin.adminDeleteModule(v.id),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useCreateContentItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => admin.adminCreateContentItem(input),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useDeleteContentItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; activity_id: string }) => admin.adminDeleteContentItem(v.id),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

// ─────────────────────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────────────────────
export function useCreateAssessment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => admin.adminCreateAssessment(input),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useUpdateAssessment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; activity_id: string; patch: any }) => admin.adminUpdateAssessment(v.id, v.patch),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useDeleteAssessment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; activity_id: string }) => admin.adminDeleteAssessment(v.id),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

// ─────────────────────────────────────────────────────────────
// QUESTION BANK
// ─────────────────────────────────────────────────────────────
export function useAdminQuestions(opts: { search?: string; type?: QuestionType } = {}) {
    return useInfiniteQuery({
        queryKey: [...ADMIN_KEY, "questions", opts],
        queryFn: ({ pageParam }) => admin.adminListQuestions({ ...opts, cursor: pageParam as string | null, limit: 25 }),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useCreateQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => admin.adminCreateQuestion(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "questions"] }),
    });
}

export function useArchiveQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => admin.adminArchiveQuestion(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "questions"] }),
    });
}

// ─────────────────────────────────────────────────────────────
// ASSESSMENT ↔ QUESTION
// ─────────────────────────────────────────────────────────────
export function useAssessmentQuestions(assessmentId: string | undefined) {
    return useQuery({
        queryKey: [...ADMIN_KEY, "assessment-questions", assessmentId],
        queryFn: () => admin.adminListAssessmentQuestions(assessmentId!),
        enabled: !!assessmentId,
    });
}

export function useAttachQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { assessment_id: string; question_id: string; position: number; points?: number }) =>
            admin.adminAttachQuestion(input),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "assessment-questions", v.assessment_id] }),
    });
}

export function useDetachQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; assessment_id: string }) => admin.adminDetachQuestion(v.id),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "assessment-questions", v.assessment_id] }),
    });
}

// ─────────────────────────────────────────────────────────────
// THUMBNAIL
// ─────────────────────────────────────────────────────────────
export function useUploadThumbnail() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { file: File; activityId: string }) => admin.adminUploadThumbnail(v.file, v.activityId),
        onSuccess: (_url, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activityId] }),
    });
}

// ─────────────────────────────────────────────────────────────
// PERIODS
// ─────────────────────────────────────────────────────────────
export function useAdminPeriods() {
    return useQuery({
        queryKey: [...ADMIN_KEY, "periods"],
        queryFn: () => admin.adminListPeriods(),
    });
}

export function useCreatePeriod() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; start_date: string; end_date: string; status?: string }) =>
            admin.adminCreatePeriod(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "periods"] }),
    });
}

// ─────────────────────────────────────────────────────────────
// COMPLETIONS
// ─────────────────────────────────────────────────────────────
export function useAdminCompletions(opts: { status?: string; activityId?: string } = {}) {
    return useInfiniteQuery({
        queryKey: [...ADMIN_KEY, "completions", opts],
        queryFn: ({ pageParam }) => admin.adminListCompletions({ ...opts, cursor: pageParam as string | null, limit: 25 }),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor,
    });
}

export function useRevokeCompletion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => admin.adminRevokeCompletion(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "completions"] }),
    });
}