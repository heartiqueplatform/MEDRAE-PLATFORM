// lib/nursingQueries.ts
import { supabase } from "./supabaseClient";

// Cache helper - stores in memory, expires after 5 seconds
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TIME = 5 * 1000; // 5 seconds

function getCached<T>(key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
        return cached.data as T;
    }
    return null;
}

function setCache(key: string, data: any) {
    cache.set(key, { data, timestamp: Date.now() });
}

export function clearNursingCache() {
    cache.clear();
}

export async function getYears() {
    const cached = getCached<any[]>("nursing_years");
    if (cached) return cached;

    const { data: program } = await supabase
        .from("academic_programs")
        .select("id")
        .eq("code", "KRCHN")
        .single();

    if (!program) return [];

    const { data: years, error } = await supabase
        .from("academic_years")
        .select(`
            id,
            year_name,
            year_number,
            academic_semesters(
                academic_modules(
                    academic_module_units(
                        academic_topics(question_count)
                    )
                )
            )
        `)
        .eq("program_id", program.id)
        .order("year_number");

    if (error || !years) return [];

    const result = years.map(year => {
        let total = 0;
        year.academic_semesters?.forEach((sem: any) => {
            sem.academic_modules?.forEach((mod: any) => {
                mod.academic_module_units?.forEach((unit: any) => {
                    unit.academic_topics?.forEach((topic: any) => {
                        total += topic.question_count || 0;
                    });
                });
            });
        });
        return {
            id: year.id,
            year_name: year.year_name,
            year_number: year.year_number,
            total_questions: total
        };
    });

    setCache("nursing_years", result);
    return result;
}

// ============================================
// PAGE 2: Get Semesters
// ============================================
export async function getSemesters(yearId: string) {
    const cacheKey = `semesters_${yearId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const { data: semesters, error } = await supabase
        .from("academic_semesters")
        .select(`
            id,
            semester_name,
            semester_number,
            academic_modules(
                academic_module_units(
                    academic_topics(question_count)
                )
            )
        `)
        .eq("academic_year_id", yearId)
        .order("semester_number");

    if (error || !semesters) return [];

    const result = semesters.map(s => {
        let total = 0;
        s.academic_modules?.forEach((mod: any) => {
            mod.academic_module_units?.forEach((unit: any) => {
                unit.academic_topics?.forEach((topic: any) => {
                    total += topic.question_count || 0;
                });
            });
        });
        return {
            id: s.id,
            semester_name: s.semester_name,
            semester_number: s.semester_number,
            total_questions: total
        };
    });

    setCache(cacheKey, result);
    return result;
}

// ============================================
// PAGE 3: Get Modules (includes is_locked)
// ============================================
export async function getModules(semesterId: string) {
    const cacheKey = `modules_${semesterId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const { data: modules, error } = await supabase
        .from("academic_modules")
        .select(`
            id,
            module_code,
            title,
            module_type,
            display_order,
            is_locked,
            academic_module_units(
                academic_topics(question_count)
            )
        `)
        .eq("semester_id", semesterId)
        .order("display_order");

    if (error || !modules) return [];

    const result = modules.map(m => {
        let total = 0;
        m.academic_module_units?.forEach((unit: any) => {
            unit.academic_topics?.forEach((topic: any) => {
                total += topic.question_count || 0;
            });
        });
        return {
            id: m.id,
            module_code: m.module_code,
            title: m.title,
            module_type: m.module_type,
            display_order: m.display_order,
            is_locked: m.is_locked,
            total_questions: total
        };
    });

    setCache(cacheKey, result);
    return result;
}

// ============================================
// PAGE 4: Get Module Units
// ============================================
export async function getModuleUnits(moduleId: string) {
    const cacheKey = `units_${moduleId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const { data: units, error } = await supabase
        .from("academic_module_units")
        .select(`
            id,
            title,
            display_order,
            academic_topics(question_count)
        `)
        .eq("module_id", moduleId)
        .order("display_order");

    if (error || !units) return [];

    const result = units.map(u => {
        let total = 0;
        u.academic_topics?.forEach((topic: any) => {
            total += topic.question_count || 0;
        });
        return {
            id: u.id,
            title: u.title,
            display_order: u.display_order,
            total_questions: total
        };
    });

    setCache(cacheKey, result);
    return result;
}

// ============================================
// PAGE 5: Get Topics
// ============================================
export async function getTopics(unitId: string) {
    const cacheKey = `topics_${unitId}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const { data: topics, error } = await supabase
        .from("academic_topics")
        .select("id, title, difficulty_level, is_exam_favorite, display_order, question_count")
        .eq("module_unit_id", unitId)
        .order("display_order");

    if (error || !topics) return [];

    setCache(cacheKey, topics);
    return topics;
}

// ============================================
// Get Resources for a Topic
// ============================================
export async function getTopicResources(topicId: string) {
    const { data } = await supabase
        .from("academic_topic_resources")
        .select("id, resource_type, title, content, file_url, external_url")
        .eq("topic_id", topicId)
        .eq("is_published", true);

    return data || [];
}

// ============================================
// PAGE 6: Get Questions for a Topic
// ============================================
// lib/nursingQueries.ts - Updated
export async function getTopicQuestions(topicId: string, limit?: number) {
    let query = supabase
        .from("academic_questions")
        .select("*")
        .eq("topic_id", topicId)
        .eq("status", "published");

    // Only apply limit if provided
    if (limit) {
        query = query.limit(limit);
    }

    const { data } = await query;

    if (data) {
        for (let i = data.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [data[i], data[j]] = [data[j], data[i]];
        }
    }

    return data || [];
}
// ============================================
// BONUS: Cross-topic practice
// ============================================
export async function getYearPracticeQuestions(yearNumber: number, limit = 20) {
    const { data } = await supabase
        .from("academic_questions")
        .select(`
            id, stem, difficulty, question_type, options, tags,
            academic_topics!inner(
                title,
                academic_module_units!inner(
                    title,
                    academic_modules!inner(
                        title,
                        academic_semesters!inner(
                            academic_years!inner(year_number)
                        )
                    )
                )
            )
        `)
        .eq("academic_topics.academic_module_units.academic_modules.academic_semesters.academic_years.year_number", yearNumber)
        .eq("status", "published")
        .limit(limit);

    return data || [];
}
// lib/nursingQueries.ts - Add these functions
// lib/nursingQueries.ts - Fully updated
export interface Suggestion {
    id: string;
    user_id: string;
    unit_name: string;
    unit_code?: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    status: string;
    endorsements_count: number;
    created_at: string;
    updated_at: string;
    user_endorsed?: boolean;
    user?: {
        user_id: string;
        name: string;
        email: string;
        avatar_url?: string;
        role?: string;
        course?: string;
        institution?: string;
        username?: string;
    };
}

// Get all suggestions with user details from profiles
export async function getSuggestions() {
    const { data: session } = await supabase.auth.getSession();
    const currentUserId = session.session?.user?.id;

    const { data, error } = await supabase
        .from('academic_suggestions')
        .select(`
            *,
            user:user_id (
                user_id,
                name,
                email,
                avatar_url,
                role,
                course,
                institution,
                username
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching suggestions:', error);
        throw error;
    }

    // Get current user's endorsements
    let userEndorsements: string[] = [];
    if (currentUserId) {
        const { data: endorsements } = await supabase
            .from('academic_suggestion_endorsements')
            .select('suggestion_id')
            .eq('user_id', currentUserId);

        userEndorsements = endorsements?.map(e => e.suggestion_id) || [];
    }

    // Transform data to match expected format
    const suggestions = data?.map(s => ({
        ...s,
        user_endorsed: userEndorsements.includes(s.id),
        user: s.user ? {
            user_id: s.user.user_id,
            name: s.user.name,
            email: s.user.email,
            avatar_url: s.user.avatar_url,
            role: s.user.role,
            course: s.user.course,
            institution: s.user.institution,
            username: s.user.username
        } : null
    })) || [];

    return suggestions;
}

// Create a suggestion
export async function createSuggestion(data: {
    unit_name: string;
    unit_code?: string;
    description?: string;
    priority?: string;
    category?: string;
    semester_id?: string;
    year_id?: string;
    module_id?: string;
}) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    const { data: suggestion, error } = await supabase
        .from('academic_suggestions')
        .insert({
            user_id: session.session.user.id,
            ...data,
            status: 'pending'
        })
        .select(`
            *,
            user:user_id (
                user_id,
                name,
                email,
                avatar_url,
                role,
                course,
                institution,
                username
            )
        `)
        .single();

    if (error) {
        console.error('Error creating suggestion:', error);
        throw error;
    }

    return suggestion;
}

// Toggle endorsement
export async function toggleEndorsement(suggestionId: string) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    // Check if already endorsed
    const { data: existing } = await supabase
        .from('academic_suggestion_endorsements')
        .select('id')
        .eq('suggestion_id', suggestionId)
        .eq('user_id', session.session.user.id)
        .single();

    if (existing) {
        // Remove endorsement
        const { error } = await supabase
            .from('academic_suggestion_endorsements')
            .delete()
            .eq('id', existing.id);

        if (error) throw error;
        return { endorsed: false };
    } else {
        // Add endorsement
        const { error } = await supabase
            .from('academic_suggestion_endorsements')
            .insert({
                suggestion_id: suggestionId,
                user_id: session.session.user.id
            });

        if (error) throw error;
        return { endorsed: true };
    }
}

// Delete suggestion (only if user owns it)
export async function deleteSuggestion(suggestionId: string) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('academic_suggestions')
        .delete()
        .eq('id', suggestionId)
        .eq('user_id', session.session.user.id);

    if (error) {
        console.error('Error deleting suggestion:', error);
        throw error;
    }
    return true;
}

// Get a single suggestion by ID
export async function getSuggestionById(suggestionId: string) {
    const { data, error } = await supabase
        .from('academic_suggestions')
        .select(`
            *,
            user:user_id (
                user_id,
                name,
                email,
                avatar_url,
                role,
                course,
                institution,
                username
            )
        `)
        .eq('id', suggestionId)
        .single();

    if (error) throw error;
    return data;
}

// Update suggestion status (admin only)
export async function updateSuggestionStatus(suggestionId: string, status: string) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    // Check if user is admin (optional - you can add role check)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.session.user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Only admins can update suggestion status');
    }

    const { data, error } = await supabase
        .from('academic_suggestions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', suggestionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Subscribe to real-time updates
export function subscribeToSuggestions(callback: () => void) {
    const subscription = supabase
        .channel('suggestions_channel')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'academic_suggestions'
            },
            () => {
                callback();
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'academic_suggestion_endorsements'
            },
            () => {
                callback();
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', status);
        });

    return () => {
        subscription.unsubscribe();
    };
}

// Get endorsement count for a suggestion
export async function getEndorsementCount(suggestionId: string) {
    const { count, error } = await supabase
        .from('academic_suggestion_endorsements')
        .select('*', { count: 'exact', head: true })
        .eq('suggestion_id', suggestionId);

    if (error) throw error;
    return count || 0;
}

// Check if user has endorsed a suggestion
export async function hasUserEndorsed(suggestionId: string, userId: string) {
    const { data, error } = await supabase
        .from('academic_suggestion_endorsements')
        .select('id')
        .eq('suggestion_id', suggestionId)
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
}

// Get all endorsers of a suggestion
export async function getSuggestionEndorsers(suggestionId: string) {
    const { data, error } = await supabase
        .from('academic_suggestion_endorsements')
        .select(`
            user_id,
            created_at,
            user:user_id (
                name,
                email,
                avatar_url,
                role,
                course
            )
        `)
        .eq('suggestion_id', suggestionId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

// Get suggestions by user
export async function getSuggestionsByUser(userId: string) {
    const { data, error } = await supabase
        .from('academic_suggestions')
        .select(`
            *,
            user:user_id (
                user_id,
                name,
                email,
                avatar_url,
                role,
                course,
                institution,
                username
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
// ============================================
// Get ALL topics for search (flat list)
// ============================================
export async function getAllTopicsForSearch() {
    const cached = getCached<any[]>("all_topics_search");
    if (cached) return cached;

    const { data, error } = await supabase
        .from("academic_topics")
        .select(`
            id,
            title,
            question_count,
            difficulty_level,
            is_exam_favorite,
            academic_module_units!inner(
                id,
                title,
                academic_modules!inner(
                    id,
                    title,
                    module_code,
                    academic_semesters!inner(
                        semester_name,
                        academic_years!inner(year_name)
                    )
                )
            )
        `)
        .gt("question_count", 0)
        .order("title");

    if (error || !data) return [];

    const topics = data.map((t: any) => ({
        id: t.id,
        title: t.title,
        question_count: t.question_count,
        difficulty_level: t.difficulty_level,
        is_exam_favorite: t.is_exam_favorite,
        unit_title: t.academic_module_units?.title || "",
        module_title: t.academic_module_units?.academic_modules?.title || "",
        module_code: t.academic_module_units?.academic_modules?.module_code || "",
        semester_name: t.academic_module_units?.academic_modules?.academic_semesters?.semester_name || "",
        year_name: t.academic_module_units?.academic_modules?.academic_semesters?.academic_years?.year_name || "",
    }));

    setCache("all_topics_search", topics);
    return topics;
}