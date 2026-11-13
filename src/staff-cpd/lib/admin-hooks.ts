// src/staff-cpd/lib/admin-hooks.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import * as admin from "./admin-api";
import * as coreApi from "../lib";
import type { CpdActivity, CpdPeriod, QuestionType, CpdQuestion } from "../lib";

const ADMIN_KEY = ["cpd", "admin"];

// ─────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────
// src/staff-cpd/lib/admin-hooks.ts

const ADMIN_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261",
    "731974f9-5af2-44c3-bf13-547fc4c89209",
];

export interface AuthorProfile {
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    email: string | null;
    is_verified_contributor: boolean;
    contributor_tier: string;
    workplace: string | null;
}

export function useAdminActivities(status?: string) {
    return useInfiniteQuery({
        queryKey: [...ADMIN_KEY, "activities", status],
        queryFn: async ({ pageParam }) => {
            const { supabase } = await import("@/lib/supabaseClient");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not signed in");
            const isAdmin = ADMIN_IDS.includes(user.id);

            const limit = 25;
            let q = supabase
                .from("cpd_activities")
                .select(`
                    *,
                    author:profiles!cpd_activities_created_by_fkey (
                        user_id, name, avatar_url, email,
                        is_verified_contributor, contributor_tier, workplace
                    )
                `)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);

            // Non-admins only see their own rows
            if (!isAdmin) q = q.eq("created_by", user.id);

            if (status) q = q.eq("status", status);

            if (pageParam) {
                const [ts, id] = (pageParam as string).split("|");
                q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
            }

            const { data, error } = await q;
            if (error) throw error;

            const rows = (data ?? []) as (CpdActivity & { author?: AuthorProfile | null })[];
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
export function useUnarchiveActivity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => admin.adminUnarchiveActivity(id),
        onSuccess: (_res, id) => {
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activities"] });
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", id] });
            qc.invalidateQueries({ queryKey: ["cpd", "activities"] });
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
// MODULES
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
        mutationFn: (v: { id: string; activity_id: string; patch: any }) =>
            admin.adminUpdateModule(v.id, v.patch),
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

// ─────────────────────────────────────────────────────────────
// CONTENT ITEMS — create / update / delete
// ─────────────────────────────────────────────────────────────
export function useCreateContentItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => admin.adminCreateContentItem(input),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "activity", v.activity_id] }),
    });
}

export function useUpdateContentItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; activity_id: string; patch: any }) =>
            admin.adminUpdateContentItem(v.id, v.patch),
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
        mutationFn: (v: { id: string; activity_id: string; patch: any }) =>
            admin.adminUpdateAssessment(v.id, v.patch),
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
        queryFn: ({ pageParam }) =>
            admin.adminListQuestions({ ...opts, cursor: pageParam as string | null, limit: 25 }),
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

/** Update only the question row (no options). */
export function useUpdateQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; patch: Partial<CpdQuestion> }) =>
            admin.adminUpdateQuestion(v.id, v.patch),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "questions"] }),
    });
}

/**
 * Update a question AND replace its options in one call.
 * Splits the payload so Supabase never tries to write an `options`
 * column onto cpd_questions (which caused PGRST204).
 */
export function useUpdateQuestionWithOptions() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (v: {
            id: string;
            patch: Partial<CpdQuestion>;
            options?: { option_text: string; is_correct: boolean; position?: number }[];
        }) => {
            const updated = await admin.adminUpdateQuestion(v.id, v.patch);
            if (v.options !== undefined) {
                await admin.adminReplaceQuestionOptions(v.id, v.options);
            }
            return updated;
        },
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "questions"] }),
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
        onSuccess: (_d, v) =>
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "assessment-questions", v.assessment_id] }),
    });
}

export function useDetachQuestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { id: string; assessment_id: string }) => admin.adminDetachQuestion(v.id),
        onSuccess: (_d, v) =>
            qc.invalidateQueries({ queryKey: [...ADMIN_KEY, "assessment-questions", v.assessment_id] }),
    });
}

// ─────────────────────────────────────────────────────────────
// THUMBNAIL
// ─────────────────────────────────────────────────────────────
export function useUploadThumbnail() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (v: { file: File; activityId: string }) =>
            admin.adminUploadThumbnail(v.file, v.activityId),
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
// src/staff-cpd/lib/admin-hooks.ts

export function useAdminCompletions(opts: { status?: string; activityId?: string } = {}) {
    return useInfiniteQuery({
        queryKey: [...ADMIN_KEY, "completions", opts],
        queryFn: async ({ pageParam }) => {
            const { supabase } = await import("@/lib/supabaseClient");

            const limit = 25;
            let q = supabase
                .from("cpd_completions")
                .select(`
                    id,
                    enrollment_id,
                    nurse_id,
                    activity_id,
                    learning_hours_completed,
                    points_awarded,
                    assessment_score,
                    completion_status,
                    completed_at,
                    verification_code,
                    certificate_id,
                    medrae_coins_awarded,
                    medrae_coins_awarded_at,
                    contributor_id,
                    created_at,

                    activity:cpd_activities!cpd_completions_activity_id_fkey (
                        id, title, thumbnail_url, category,
                        learning_hours, configured_cpd_points, created_by
                    ),

                    nurse:profiles!cpd_completions_nurse_id_fkey (
                        user_id, name, email, avatar_url,
                        workplace, nck_number, specialization,
                        is_verified_contributor, contributor_tier
                    ),

                    enrollment:cpd_enrollments!cpd_completions_enrollment_id_fkey (
                        id, status, progress_percentage,
                        started_at, last_accessed_at, completed_at,
                        attempts_count
                    ),

                    certificate:cpd_certificates!cpd_completions_certificate_id_fkey (
                        id, certificate_number, verification_code,
                        issued_at, status
                    )
                `)
                .order("completed_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(limit + 1);

            if (opts.status) q = q.eq("completion_status", opts.status);
            if (opts.activityId) q = q.eq("activity_id", opts.activityId);

            if (pageParam) {
                const [ts, id] = (pageParam as string).split("|");
                q = q.or(`completed_at.lt.${ts},and(completed_at.eq.${ts},id.lt.${id})`);
            }

            const { data, error } = await q;
            if (error) throw error;

            const rows = (data ?? []) as any[];
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const last = items[items.length - 1];
            return {
                items,
                nextCursor: hasMore && last ? `${last.completed_at}|${last.id}` : null,
            };
        },
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

// ─────────────────────────────────────────────────────────────
// MEDRAE COIN CONFIG — single source of truth
// ─────────────────────────────────────────────────────────────

export interface MedraeCoinConfig {
    coin_to_kes_rate: number;
    coins_per_completion: number;
    minimum_withdrawal: number;
    max_activities_per_user: number;
    max_submissions_per_month: number;
    updated_at: string;
}

export function useMedraeCoinConfig() {
    return useQuery({
        queryKey: ["medrae", "coin-config"],
        queryFn: async (): Promise<MedraeCoinConfig> => {
            const { supabase } = await import("@/lib/supabaseClient");
            const { data, error } = await supabase
                .from("medrae_coin_config")
                .select("*")
                .eq("id", 1)
                .single();
            if (error) throw error;
            return data as MedraeCoinConfig;
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}