// src/staff-cpd/lib/admin-api.ts
import { supabase } from "@/lib/supabaseClient";
import * as api from "../lib";
import type {
    CpdActivity, CpdModule, CpdContentItem, CpdAssessment,
    CpdQuestion, CpdQuestionOption, CpdPeriod, ContentType, ExternalProvider, QuestionType,
} from "../lib";

// ─────────────────────────────────────────────────────────────
// ACTIVITIES — create / update / delete / publish
// ─────────────────────────────────────────────────────────────
export async function adminCreateActivity(draft: Partial<CpdActivity>): Promise<CpdActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
        .from("cpd_activities")
        .insert({ ...draft, created_by: user.id, status: "draft" })
        .select("*").single();
    if (error) throw error;
    return data as CpdActivity;
}

export async function adminUpdateActivity(id: string, patch: Partial<CpdActivity>): Promise<CpdActivity> {
    const { data, error } = await supabase
        .from("cpd_activities").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CpdActivity;
}

export async function adminDeleteActivity(id: string): Promise<void> {
    const { error } = await supabase.from("cpd_activities").delete().eq("id", id);
    if (error) throw error;
}

export async function adminPublishActivity(id: string) {
    const { data, error } = await supabase.rpc("cpd_publish_activity", { p_activity_id: id });
    if (error) throw error;
    return data;
}

// ─────────────────────────────────────────────────────────────
// MODULES
// ─────────────────────────────────────────────────────────────
export async function adminCreateModule(input: {
    activity_id: string; title: string; position: number; estimated_minutes?: number | null;
}): Promise<CpdModule> {
    const { data, error } = await supabase.from("cpd_modules").insert(input).select("*").single();
    if (error) throw error;
    return data as CpdModule;
}

export async function adminUpdateModule(id: string, patch: Partial<CpdModule>): Promise<CpdModule> {
    const { data, error } = await supabase.from("cpd_modules").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CpdModule;
}

export async function adminDeleteModule(id: string): Promise<void> {
    const { error } = await supabase.from("cpd_modules").delete().eq("id", id);
    if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// CONTENT ITEMS — with validation
// ─────────────────────────────────────────────────────────────
export async function adminCreateContentItem(input: {
    module_id: string;
    activity_id: string;              // ← used only for cache invalidation on the client
    content_type: ContentType;
    external_provider?: ExternalProvider | null;
    title: string;
    description?: string | null;
    external_url?: string | null;
    duration_seconds?: number | null;
    position: number;
    is_required?: boolean;
    metadata?: Record<string, any>;
}): Promise<CpdContentItem & { activity_id: string }> {
    const check = api.validateContentItem({
        content_type: input.content_type,
        external_provider: input.external_provider ?? null,
        external_url: input.external_url ?? null,
        external_id: null,
    });
    if (!check.ok) throw new Error(check.reason || "Invalid content");

    // Strip fields that don't exist on the table
    const { activity_id, ...rest } = input;
    const merged = { ...rest, ...(check.normalized ?? {}) };

    const { data, error } = await supabase
        .from("cpd_content_items")
        .insert(merged)
        .select("*")
        .single();
    if (error) throw error;

    // Re-attach activity_id so useCreateContentItem can invalidate the right key
    return { ...(data as CpdContentItem), activity_id };
}

export async function adminUpdateContentItem(id: string, patch: Partial<CpdContentItem>): Promise<CpdContentItem> {
    const { data, error } = await supabase.from("cpd_content_items").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CpdContentItem;
}

export async function adminDeleteContentItem(id: string): Promise<void> {
    const { error } = await supabase.from("cpd_content_items").delete().eq("id", id);
    if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────────────────────
export async function adminCreateAssessment(input: {
    activity_id: string; module_id?: string | null;
    title: string; description?: string | null;
    pass_mark?: number; attempt_limit?: number | null; randomize_questions?: boolean;
}): Promise<CpdAssessment> {
    const { data, error } = await supabase.from("cpd_assessments").insert(input).select("*").single();
    if (error) throw error;
    return data as CpdAssessment;
}

export async function adminUpdateAssessment(id: string, patch: Partial<CpdAssessment>): Promise<CpdAssessment> {
    const { data, error } = await supabase.from("cpd_assessments").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CpdAssessment;
}

export async function adminDeleteAssessment(id: string): Promise<void> {
    const { error } = await supabase.from("cpd_assessments").delete().eq("id", id);
    if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// QUESTION BANK
// ─────────────────────────────────────────────────────────────
export async function adminListQuestions(opts: {
    search?: string; type?: QuestionType; limit?: number; cursor?: string | null;
} = {}) {
    const limit = opts.limit ?? 25;
    let q = supabase
        .from("cpd_questions")
        .select("*, options:cpd_question_options(*)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (opts.type) q = q.eq("question_type", opts.type);
    if (opts.search) q = q.ilike("question", `%${opts.search}%`);
    if (opts.cursor) {
        const [ts, id] = opts.cursor.split("|");
        q = q.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`);
    }
    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as (CpdQuestion & { options: CpdQuestionOption[] })[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
        items,
        nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null,
    };
}

export async function adminCreateQuestion(input: {
    question: string;
    question_type: QuestionType;
    explanation?: string | null;
    difficulty?: string | null;
    options?: { option_text: string; is_correct: boolean; position?: number }[];
}): Promise<CpdQuestion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: q, error: qe } = await supabase
        .from("cpd_questions")
        .insert({
            question: input.question,
            question_type: input.question_type,
            explanation: input.explanation ?? null,
            difficulty: input.difficulty ?? null,
            created_by: user.id,
            status: "active",
        })
        .select("*").single();
    if (qe) throw qe;

    if (input.options?.length) {
        const opts = input.options.map((o, i) => ({
            question_id: q.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
            position: o.position ?? i,
        }));
        const { error: oe } = await supabase.from("cpd_question_options").insert(opts);
        if (oe) throw oe;
    }

    return q as CpdQuestion;
}

export async function adminUpdateQuestion(id: string, patch: Partial<CpdQuestion>): Promise<CpdQuestion> {
    const { data, error } = await supabase.from("cpd_questions").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CpdQuestion;
}

export async function adminReplaceQuestionOptions(
    questionId: string,
    options: { option_text: string; is_correct: boolean; position?: number }[]
): Promise<void> {
    await supabase.from("cpd_question_options").delete().eq("question_id", questionId);
    if (!options.length) return;
    const rows = options.map((o, i) => ({
        question_id: questionId,
        option_text: o.option_text,
        is_correct: o.is_correct,
        position: o.position ?? i,
    }));
    const { error } = await supabase.from("cpd_question_options").insert(rows);
    if (error) throw error;
}

export async function adminArchiveQuestion(id: string): Promise<void> {
    const { error } = await supabase.from("cpd_questions").update({ status: "archived" }).eq("id", id);
    if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// ASSESSMENT ↔ QUESTION ATTACHMENT
// ─────────────────────────────────────────────────────────────
export async function adminListAssessmentQuestions(assessmentId: string) {
    const { data, error } = await supabase
        .from("cpd_assessment_questions")
        .select("id, position, points, question:cpd_questions(*, options:cpd_question_options(*))")
        .eq("assessment_id", assessmentId)
        .order("position");
    if (error) throw error;
    return data ?? [];
}

export async function adminAttachQuestion(input: {
    assessment_id: string; question_id: string; position: number; points?: number;
}) {
    const { data, error } = await supabase
        .from("cpd_assessment_questions").insert({
            assessment_id: input.assessment_id,
            question_id: input.question_id,
            position: input.position,
            points: input.points ?? 1,
        }).select("*").single();
    if (error) throw error;
    return data;
}

export async function adminDetachQuestion(id: string): Promise<void> {
    const { error } = await supabase.from("cpd_assessment_questions").delete().eq("id", id);
    if (error) throw error;
}

export async function adminReorderAssessmentQuestions(
    assessmentId: string,
    orderedIds: string[]
): Promise<void> {
    // Simple sequential update — safe for small N
    for (let i = 0; i < orderedIds.length; i++) {
        await supabase
            .from("cpd_assessment_questions")
            .update({ position: i })
            .eq("id", orderedIds[i])
            .eq("assessment_id", assessmentId);
    }
}

// ─────────────────────────────────────────────────────────────
// THUMBNAIL UPLOAD (Supabase Storage)
// ─────────────────────────────────────────────────────────────
export async function adminUploadThumbnail(file: File, activityId: string): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${activityId}/cover-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
        .from("cpd-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from("cpd-assets").getPublicUrl(path);
    return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// PERIODS
// ─────────────────────────────────────────────────────────────
export async function adminListPeriods(): Promise<CpdPeriod[]> {
    const { data, error } = await supabase
        .from("cpd_periods").select("*").order("start_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CpdPeriod[];
}

export async function adminCreatePeriod(input: {
    name: string; start_date: string; end_date: string; status?: string;
}): Promise<CpdPeriod> {
    const { data, error } = await supabase
        .from("cpd_periods").insert(input).select("*").single();
    if (error) throw error;
    return data as CpdPeriod;
}

export async function adminUpdatePeriod(id: string, patch: Partial<CpdPeriod>): Promise<CpdPeriod> {
    const { data, error } = await supabase
        .from("cpd_periods").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as CpdPeriod;
}

// ─────────────────────────────────────────────────────────────
// COMPLETIONS (admin view)
// ─────────────────────────────────────────────────────────────
export async function adminListCompletions(opts: {
    status?: string; activityId?: string; limit?: number; cursor?: string | null;
} = {}) {
    const limit = opts.limit ?? 25;
    let q = supabase
        .from("cpd_completions")
        .select("*, activity:cpd_activities(id,title), nurse:profiles!cpd_completions_nurse_id_fkey(name,email)")
        .order("completed_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (opts.status) q = q.eq("completion_status", opts.status);
    if (opts.activityId) q = q.eq("activity_id", opts.activityId);
    if (opts.cursor) {
        const [ts, id] = opts.cursor.split("|");
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
}

export async function adminRevokeCompletion(id: string): Promise<void> {
    const { error } = await supabase
        .from("cpd_completions")
        .update({ completion_status: "revoked" })
        .eq("id", id);
    if (error) throw error;
}
// ─────────────────────────────────────────────────────────────
// SAFE DELETE — the one entry point for removing an activity
//
// Rule:
//   • If the activity has ANY completions → archive it.
//     Nurses keep their certificates, points, and verification codes.
//   • If it has NO completions → hard delete.
//     Modules, content items, assessments, enrollments cascade.
//
// Never throws on FK conflict. Always resolves to one of:
//   { action: 'archived', id }
//   { action: 'deleted', id }
// ─────────────────────────────────────────────────────────────
export async function adminRemoveActivity(activityId: string): Promise<{
    action: "archived" | "deleted";
    id: string;
}> {
    // 1. Count completions to decide archive vs delete
    const { count, error: countErr } = await supabase
        .from("cpd_completions")
        .select("*", { count: "exact", head: true })
        .eq("activity_id", activityId);

    if (countErr) throw countErr;

    const hasHistory = (count ?? 0) > 0;

    // 2. Archive if history exists
    if (hasHistory) {
        const { error } = await supabase
            .from("cpd_activities")
            .update({
                status: "archived",
                archived_at: new Date().toISOString(),
            })
            .eq("id", activityId);

        if (error) throw error;
        return { action: "archived", id: activityId };
    }

    // 3. Hard delete if no history
    const { error } = await supabase
        .from("cpd_activities")
        .delete()
        .eq("id", activityId);

    if (error) throw error;
    return { action: "deleted", id: activityId };
}