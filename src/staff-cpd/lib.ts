// src/staff-cpd/lib.ts
import { supabase } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────
// TYPES — mirror the SQL schema exactly
// ─────────────────────────────────────────────────────────────
export type CpdStatus = "draft" | "review" | "published" | "archived";
export type ContentType =
    | "video" | "podcast" | "article" | "pdf" | "external_resource"
    | "text" | "case_study" | "quiz" | "assessment" | "webinar";
export type ExternalProvider = "youtube" | "apple_podcasts" | "external" | "internal";
export type EnrollmentStatus =
    | "enrolled" | "in_progress" | "assessment" | "completed" | "failed" | "abandoned";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type QuestionType = "multiple_choice" | "multiple_select" | "true_false" | "short_answer";

export interface CpdActivity {
    id: string; title: string; description: string | null; short_description: string | null;
    category: string | null; difficulty: string | null;
    learning_hours: number; configured_cpd_points: number; pass_mark: number | null;
    status: CpdStatus; thumbnail_url: string | null;
    created_by: string; created_at: string; updated_at: string;
    published_at: string | null; archived_at: string | null;
}

export interface CpdModule {
    id: string; activity_id: string; title: string; description: string | null;
    position: number; estimated_minutes: number | null;
    created_at: string; updated_at: string;
}

export interface CpdContentItem {
    id: string; module_id: string; content_type: ContentType; title: string;
    description: string | null; external_url: string | null;
    external_provider: ExternalProvider | null; external_id: string | null;
    duration_seconds: number | null; position: number; is_required: boolean;
    metadata: Record<string, any>; created_at: string; updated_at: string;
}

export interface CpdEnrollment {
    id: string; activity_id: string; nurse_id: string; status: EnrollmentStatus;
    progress_percentage: number; started_at: string | null;
    last_accessed_at: string | null; completed_at: string | null;
    created_at: string; updated_at: string;
}

export interface CpdContentProgress {
    id: string; enrollment_id: string; content_item_id: string;
    status: ProgressStatus; progress_percentage: number;
    started_at: string | null; completed_at: string | null;
    last_position: number | null; created_at: string; updated_at: string;
}

export interface CpdAssessment {
    id: string; activity_id: string; module_id: string | null;
    title: string; description: string | null; pass_mark: number;
    attempt_limit: number | null; randomize_questions: boolean;
    created_at: string; updated_at: string;
}

export interface CpdQuestion {
    id: string; question: string; question_type: QuestionType;
    explanation: string | null; difficulty: string | null;
    created_by: string | null; status: "active" | "archived";
    metadata: Record<string, any>; created_at: string; updated_at: string;
}

export interface CpdQuestionOption {
    id: string; question_id: string; option_text: string;
    is_correct: boolean; position: number;
}

export interface CpdAssessmentAttempt {
    id: string; assessment_id: string; nurse_id: string;
    enrollment_id: string; score: number | null; passed: boolean | null;
    started_at: string; submitted_at: string | null; attempt_number: number;
}

export interface CpdCompletion {
    id: string; enrollment_id: string; nurse_id: string; activity_id: string;
    learning_hours_completed: number; points_awarded: number;
    assessment_score: number | null; completion_status: "pending" | "verified" | "revoked";
    completed_at: string; verification_code: string;
    certificate_id: string | null; created_at: string;
}

export interface CpdCertificate {
    id: string; completion_id: string; nurse_id: string;
    certificate_number: string; verification_code: string;
    issued_at: string; status: "issued" | "revoked" | "expired";
    metadata: Record<string, any>;
}

export interface CpdPeriod {
    id: string; name: string; start_date: string; end_date: string;
    status: "upcoming" | "active" | "closed"; created_at: string;
}

export interface CpdDashboardStats {
    total_points: number;
    total_hours: number;
    completed_count: number;
    in_progress_count: number;
    certificates_count: number;
    current_period: CpdPeriod | null;
    recent_completions: CpdCompletion[];
}

// ─────────────────────────────────────────────────────────────
// CURSOR PAGINATION HELPER
// Every list query returns { items, nextCursor }
// Cursor = `${created_at}|${id}` — stable, unique, sortable
// ─────────────────────────────────────────────────────────────
export type Cursor = string | null;
export interface Page<T> { items: T[]; nextCursor: Cursor; }

export function parseCursor(c: Cursor): { ts: string; id: string } | null {
    if (!c) return null;
    const [ts, id] = c.split("|");
    if (!ts || !id) return null;
    return { ts, id };
}
export function makeCursor(row: { created_at?: string; completed_at?: string; id: string }): Cursor {
    const ts = row.completed_at || row.created_at;
    if (!ts) return null;
    return `${ts}|${row.id}`;
}

// ─────────────────────────────────────────────────────────────
// QUERY HELPERS — one function per logical operation
// ─────────────────────────────────────────────────────────────

// ---- ACTIVITIES (public to staff + any authenticated user) ----
export async function listActivities(opts: {
    cursor?: Cursor; limit?: number;
    category?: string; difficulty?: string; search?: string;
} = {}): Promise<Page<CpdActivity>> {
    const limit = opts.limit ?? 20;
    const cur = parseCursor(opts.cursor ?? null);

    let q = supabase
        .from("cpd_activities")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (opts.category) q = q.eq("category", opts.category);
    if (opts.difficulty) q = q.eq("difficulty", opts.difficulty);
    if (opts.search) q = q.ilike("title", `%${opts.search}%`);
    if (cur) q = q.or(`published_at.lt.${cur.ts},and(published_at.eq.${cur.ts},id.lt.${cur.id})`);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as CpdActivity[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
        items,
        nextCursor: hasMore && last ? `${last.published_at ?? last.created_at}|${last.id}` : null,
    };
}

export async function getActivity(id: string): Promise<CpdActivity | null> {
    const { data, error } = await supabase
        .from("cpd_activities").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as CpdActivity | null;
}

export async function getActivityTree(activityId: string): Promise<{
    activity: CpdActivity;
    modules: CpdModule[];
    contentByModule: Record<string, CpdContentItem[]>;
    assessments: CpdAssessment[];
}> {
    const [a, m, c, s] = await Promise.all([
        supabase.from("cpd_activities").select("*").eq("id", activityId).maybeSingle(),
        supabase.from("cpd_modules").select("*").eq("activity_id", activityId).order("position"),
        supabase.from("cpd_content_items").select("*").order("position"),
        supabase.from("cpd_assessments").select("*").eq("activity_id", activityId),
    ]);
    if (a.error) throw a.error;
    if (!a.data) throw new Error("Activity not found");

    const modules = (m.data ?? []) as CpdModule[];
    const moduleIds = new Set(modules.map(x => x.id));
    const items = ((c.data ?? []) as CpdContentItem[]).filter(i => moduleIds.has(i.module_id));
    const contentByModule: Record<string, CpdContentItem[]> = {};
    for (const it of items) (contentByModule[it.module_id] ||= []).push(it);

    return {
        activity: a.data as CpdActivity,
        modules,
        contentByModule,
        assessments: (s.data ?? []) as CpdAssessment[],
    };
}

// ---- ENROLLMENTS ----
export async function getMyEnrollment(activityId: string, nurseId: string): Promise<CpdEnrollment | null> {
    const { data, error } = await supabase
        .from("cpd_enrollments").select("*")
        .eq("activity_id", activityId).eq("nurse_id", nurseId)
        .maybeSingle();
    if (error) throw error;
    return data as CpdEnrollment | null;
}

export async function enrollInActivity(activityId: string, nurseId: string): Promise<CpdEnrollment> {
    const { data, error } = await supabase
        .from("cpd_enrollments")
        .insert({ activity_id: activityId, nurse_id: nurseId, status: "enrolled", started_at: new Date().toISOString() })
        .select("*").single();
    if (error) throw error;
    return data as CpdEnrollment;
}

export async function listMyEnrollments(nurseId: string, opts: { cursor?: Cursor; limit?: number; status?: EnrollmentStatus } = {}): Promise<Page<CpdEnrollment & { activity: CpdActivity }>> {
    const limit = opts.limit ?? 20;
    const cur = parseCursor(opts.cursor ?? null);

    let q = supabase
        .from("cpd_enrollments")
        .select("*, activity:cpd_activities(*)")
        .eq("nurse_id", nurseId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (opts.status) q = q.eq("status", opts.status);
    if (cur) q = q.or(`created_at.lt.${cur.ts},and(created_at.eq.${cur.ts},id.lt.${cur.id})`);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as (CpdEnrollment & { activity: CpdActivity })[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return { items, nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null };
}

// ---- CONTENT PROGRESS ----
export async function listProgressForEnrollment(enrollmentId: string): Promise<CpdContentProgress[]> {
    const { data, error } = await supabase
        .from("cpd_content_progress").select("*").eq("enrollment_id", enrollmentId);
    if (error) throw error;
    return (data ?? []) as CpdContentProgress[];
}

export async function upsertProgress(input: {
    enrollment_id: string; content_item_id: string;
    status?: ProgressStatus; progress_percentage?: number;
    last_position?: number | null;
}): Promise<CpdContentProgress> {
    const now = new Date().toISOString();
    const patch: any = { ...input, updated_at: now };

    if (input.status === "in_progress") patch.started_at ??= now;
    if (input.status === "completed") patch.completed_at = now;

    const { data, error } = await supabase
        .from("cpd_content_progress")
        .upsert(patch, { onConflict: "enrollment_id,content_item_id" })
        .select("*").single();
    if (error) throw error;
    return data as CpdContentProgress;
}

// ---- ASSESSMENTS ----
export async function getAssessmentWithQuestions(assessmentId: string): Promise<{
    assessment: CpdAssessment;
    questions: (CpdQuestion & { options: CpdQuestionOption[] })[];
}> {
    const { data: a, error: ae } = await supabase
        .from("cpd_assessments").select("*").eq("id", assessmentId).maybeSingle();
    if (ae) throw ae;
    if (!a) throw new Error("Assessment not found");

    // Question bank is RLS staff-only → students can't fetch it directly.
    // Instead we call an RPC that returns the questions WITHOUT is_correct flags.
    const { data: qs, error: qe } = await supabase.rpc("cpd_get_assessment_questions", {
        p_assessment_id: assessmentId,
    });
    if (qe) throw qe;

    return { assessment: a as CpdAssessment, questions: (qs ?? []) as any };
}

export async function startAttempt(assessmentId: string, enrollmentId: string) {
    const { data, error } = await supabase.rpc("cpd_start_attempt", {
        p_assessment_id: assessmentId,
        p_enrollment_id: enrollmentId,
    });
    if (error) throw error;
    return data as CpdAssessmentAttempt;
}

export async function submitAttempt(attemptId: string, answers: Record<string, any>) {
    // Server-side scoring — client cannot set score/passed
    const { data, error } = await supabase.rpc("cpd_submit_assessment", {
        p_attempt_id: attemptId,
        p_answers: answers,
    });
    if (error) throw error;
    return data as { score: number; passed: boolean; attempt_id: string };
}

export async function getAttemptResults(attemptId: string) {
    const { data, error } = await supabase
        .from("cpd_assessment_attempts")
        .select("*, answers:cpd_attempt_answers(*, question:cpd_questions(*))")
        .eq("id", attemptId).maybeSingle();
    if (error) throw error;
    return data;
}

// ---- COMPLETIONS ----
export async function listMyCompletions(nurseId: string, opts: { cursor?: Cursor; limit?: number } = {}): Promise<Page<CpdCompletion & { activity: CpdActivity }>> {
    const limit = opts.limit ?? 20;
    const cur = parseCursor(opts.cursor ?? null);

    let q = supabase
        .from("cpd_completions")
        .select("*, activity:cpd_activities(*)")
        .eq("nurse_id", nurseId)
        .eq("completion_status", "verified")
        .order("completed_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (cur) q = q.or(`completed_at.lt.${cur.ts},and(completed_at.eq.${cur.ts},id.lt.${cur.id})`);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as (CpdCompletion & { activity: CpdActivity })[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return { items, nextCursor: hasMore && last ? `${last.completed_at}|${last.id}` : null };
}

// ---- CERTIFICATES ----
export async function listMyCertificates(nurseId: string, opts: { cursor?: Cursor; limit?: number } = {}): Promise<Page<CpdCertificate>> {
    const limit = opts.limit ?? 20;
    const cur = parseCursor(opts.cursor ?? null);

    let q = supabase
        .from("cpd_certificates")
        .select("*")
        .eq("nurse_id", nurseId)
        .order("issued_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (cur) q = q.or(`issued_at.lt.${cur.ts},and(issued_at.eq.${cur.ts},id.lt.${cur.id})`);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as CpdCertificate[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return { items, nextCursor: hasMore && last ? `${last.issued_at}|${last.id}` : null };
}

export async function getCertificate(id: string): Promise<CpdCertificate | null> {
    const { data, error } = await supabase
        .from("cpd_certificates").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as CpdCertificate | null;
}

export async function verifyCertificate(code: string): Promise<{
    valid: boolean; certificate?: CpdCertificate; completion?: CpdCompletion; activity?: CpdActivity;
}> {
    const { data, error } = await supabase.rpc("cpd_verify_certificate", { p_code: code });
    if (error) throw error;
    return data as any;
}

// ---- PERIODS ----
export async function getCurrentPeriod(): Promise<CpdPeriod | null> {
    const { data, error } = await supabase
        .from("cpd_periods").select("*").eq("status", "active")
        .order("start_date", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data as CpdPeriod | null;
}

// ---- DASHBOARD (single call, aggregated server-side) ----
export async function getDashboardStats(nurseId: string): Promise<CpdDashboardStats> {
    // Uses a SECURITY DEFINER RPC so it's one round-trip, not 6 queries
    const { data, error } = await supabase.rpc("cpd_dashboard_stats", { p_nurse_id: nurseId });
    if (error) throw error;
    return data as CpdDashboardStats;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION LAYER (used by admin before publish)
// ─────────────────────────────────────────────────────────────

export function validateContentItem(item: Pick<CpdContentItem, "content_type" | "external_provider" | "external_url" | "external_id">): { ok: boolean; reason?: string; normalized?: Partial<CpdContentItem> } {
    const url = item.external_url?.trim() ?? "";
    const provider = item.external_provider;
    const type = item.content_type;

    // Providers require URLs
    if (provider && provider !== "internal" && !url) {
        return { ok: false, reason: `${provider} content requires a URL.` };
    }

    if (provider === "youtube") {
        const id = extractYouTubeId(url);
        if (!id) return { ok: false, reason: "Not a valid YouTube URL." };
        return {
            ok: true,
            normalized: {
                external_id: id,
                external_url: `https://www.youtube.com/watch?v=${id}`,
                metadata: { ...(item as any).metadata, youtube_id: id },
            },
        };
    }

    if (provider === "apple_podcasts") {
        if (!isApplePodcastUrl(url)) return { ok: false, reason: "Not a valid Apple Podcasts URL." };
        return { ok: true, normalized: { external_url: url } };
    }

    if (url) {
        try {
            const u = new URL(url);
            if (!["http:", "https:"].includes(u.protocol)) {
                return { ok: false, reason: "Only http(s) URLs are allowed." };
            }
        } catch {
            return { ok: false, reason: "Malformed URL." };
        }
    }

    // Text / case_study / assessment / quiz need NO url — fine.
    return { ok: true };
}

export function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /youtu\.be\/([A-Za-z0-9_-]{6,})/,
        /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
        /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
        /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

export function isApplePodcastUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return /(^|\.)podcasts\.apple\.com$/.test(u.hostname);
    } catch { return false; }
}

// ─────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────
export function fmtHours(h: number | null | undefined): string {
    if (h == null) return "0h";
    return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1).replace(/\.0$/, "")}h`;
}
export function fmtPoints(p: number | null | undefined): string {
    if (p == null) return "0";
    return Number.isInteger(p) ? String(p) : p.toFixed(1);
}
export function fmtDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
export function fmtDuration(seconds: number | null | undefined): string {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

// Content-type label for UI chips
export const CONTENT_LABEL: Record<ContentType, string> = {
    video: "Video", podcast: "Podcast", article: "Article", pdf: "PDF",
    external_resource: "Resource", text: "Reading", case_study: "Case Study",
    quiz: "Quiz", assessment: "Assessment", webinar: "Webinar",
};