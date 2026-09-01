import { supabase } from "@/lib/supabaseClient";


export type ExamCenter = {
    id: string;
    name: string;
    county: string;
    town: string;
    venue_type: string;
    notes: string;
    map_link: string;
};


export const survivalApi = {
    async getAllHospitals() {
        const { data } = await supabase.from('oriented_nearby_hospitals').select('id, hospital_name');
        return data || [];
    },

    async getAllPlacementSites() {
        const { data } = await supabase.from('oriented_placement_sites').select('id, hospital_name, county');
        return data || [];
    },

    async getDashboardStats() {
        const [centers, housing, hospitals] = await Promise.all([
            supabase.from("oriented_exam_centers").select("id", { count: "exact" }),
            supabase.from("oriented_student_housing").select("id", { count: "exact" }),
            supabase.from("oriented_nearby_hospitals").select("id", { count: "exact" }),
        ]);

        return {
            centersCount: centers.count || 0,
            housingCount: housing.count || 0,
            hospitalsCount: hospitals.count || 0,
        };
    },

    async getExamCenters() {
        const { data, error } = await supabase
            .from("oriented_exam_centers")
            .select(`
                *,
                uploader:profiles!created_by (
                    name,
                    avatar_url
                )
            `)
            .order("name", { ascending: true });

        if (error) throw error;
        return data;
    },

    async addExamCenter(centerData: any) {
        const { data, error } = await supabase
            .from('oriented_exam_centers')
            .insert([centerData])
            .select();
        if (error) throw error;
        return data[0];
    },

    async updateExamCenter(id: string, centerData: any) {
        const { data, error } = await supabase
            .from('oriented_exam_centers')
            .update(centerData)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data[0];
    },


    async deleteExamCenter(id: string) {
        const { error } = await supabase
            .from('oriented_exam_centers')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    async getExamBuddies(centerId: string) {
        const { data, error } = await supabase
            .from('oriented_exam_buddies')
            .select(`
                *,
                student:profiles!user_id (
                    name,
                    avatar_url,
                    institution,
                    course,
                    specialization
                )
            `)
            .eq('exam_center_id', centerId);

        if (error) throw error;
        return data;
    },
    async getUserRegistrationStatus(userId, cycle) {
        const { data } = await supabase
            .from('oriented_exam_buddies')
            .select('*, exam_center:oriented_exam_centers(name)')
            .eq('user_id', userId)
            .eq('exam_cycle', cycle)
            .single();
        return data;
    },
    async joinExamCenter(details: {
        centerId: string,
        examCycle: string,
        roommate: boolean,
        study: boolean
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please login first");

        const { data, error } = await supabase
            .from('oriented_exam_buddies')
            .upsert({
                user_id: user.id,
                exam_center_id: details.centerId,
                exam_cycle: details.examCycle,
                is_looking_for_roommate: details.roommate,
                is_looking_for_study_partner: details.study
            })
            .select();

        if (error) throw error;
        return data[0];
    },

    async leaveExamCenter(centerId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('oriented_exam_buddies')
            .delete()
            .eq('user_id', user?.id)
            .eq('exam_center_id', centerId);

        if (error) throw error;
        return true;
    },

    async getHousing(params: { centerId?: string, hospitalId?: string, placementId?: string }) {
        // 1. First, check who is currently logged in
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
            .from('oriented_student_housing')
            .select(`
            *,
            images,
            oriented_exam_centers(name),
            oriented_nearby_hospitals(hospital_name),
            oriented_placement_sites(hospital_name),
            contributor:profiles!oriented_student_housing_created_by_fkey(
                user_id,
                name,
                username,
                avatar_url,
                institution
            )
        `);

        if (params.centerId) {
            query = query.eq('exam_center_id', params.centerId);
        }

        if (params.hospitalId) {
            query = query.eq('nearby_hospital_id', params.hospitalId);
        }

        if (params.placementId) {
            query = query.eq('placement_site_id', params.placementId);
        }

        const { data, error } = await query.order('price_per_night', { ascending: true });

        if (error) throw error;


        return data.map(house => ({
            ...house,
            is_owner: user?.id === house.created_by
        }));
    },

    // 3. ADD THIS NEW FUNCTION BELOW getHousing
    async deleteHousing(houseId: string) {
        const { error } = await supabase
            .from('oriented_student_housing')
            .delete()
            .eq('id', houseId);

        if (error) throw error;
        return true;
    },

    async getHospitals(params?: {
        centerId?: string;
        hospitalId?: string;
        placementId?: string;
    }) {

        let query = supabase.from("oriented_nearby_hospitals").select(`
            *,
            uploader:profiles!created_by (
                name,
                avatar_url
            )
        `);

        if (params?.centerId) {
            query = query.eq("exam_center_id", params.centerId);
        }

        if (params?.hospitalId) {
            query = query.eq("id", params.hospitalId);
        }

        if (params?.placementId) {
            // Note: matching your schema, this is usually exam_center_id or hospital_id
            query = query.eq("exam_center_id", params.placementId);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data;
    },

    // Add a new hospital (Ensure hospitalData includes created_by)
    async addHospital(hospitalData: any) {
        const { data, error } = await supabase
            .from('oriented_nearby_hospitals')
            .insert([hospitalData])
            .select();

        if (error) throw error;
        return data[0];
    },

    // Update an existing hospital
    async updateHospital(id: string, hospitalData: any) {
        const { data, error } = await supabase
            .from('oriented_nearby_hospitals')
            .update(hospitalData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    // Delete a hospital
    async deleteHospital(id: string) {
        const { error } = await supabase
            .from('oriented_nearby_hospitals')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /* 📍 5. PLACEMENT SITES
       Fetches clinical placement locations (Admin data)
    */
    async getPlacements() {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('oriented_placement_sites')
            .select('*')
            .order('hospital_name', { ascending: true });

        if (error) throw error;

        return data.map(site => ({
            ...site,
            is_owner: user?.id === site.created_by
        }));
    },

    async deletePlacement(id: string) {
        const { error } = await supabase
            .from('oriented_placement_sites')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    async getReviews(targetId: string) {
        const { data, error } = await supabase
            .from('oriented_reviews')
            .select(`
            *,
            reviewer:profiles!oriented_reviews_user_id_fkey (
                name,
                avatar_url,
                institution
            )
        `)
            .eq('target_id', targetId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },
    async getPlacementById(id: string) {
        const { data, error } = await supabase
            .from('oriented_placement_sites')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createPlacementSite(formData: any) {
        // 1. Get the current user's ID
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("You must be logged in to add a site");

        // 2. Insert into database with the user's ID
        const { data, error } = await supabase
            .from('oriented_placement_sites')
            .insert([{
                ...formData,
                created_by: user.id // This links the post to the user
            }])
            .select();

        if (error) throw error;
        return data;
    },


    // ✍️ ADD REVIEW: Saves a new star rating and comment
    async addReview(reviewData: {
        user_id: string;
        target_type: string; // e.g., 'housing' or 'hospital'
        target_id: string;
        rating: number;
        comment: string;
    }) {
        const { data, error } = await supabase
            .from('oriented_reviews')
            .insert([reviewData])
            .select();

        if (error) throw error;
        return data;
    },
    async updateReview(
        reviewId: string,
        updates: {
            rating?: number;
            comment?: string;
        }
    ) {
        const { data, error } = await supabase
            .from("oriented_reviews")
            .update(updates)
            .eq("id", reviewId)
            .select()
            .single();

        if (error) throw error;

        return data;
    },

    async deleteReview(reviewId: string) {
        const { error } = await supabase
            .from("oriented_reviews")
            .delete()
            .eq("id", reviewId);

        if (error) throw error;

        return true;
    },

    async createHousing(formData: {
        exam_center_id?: string | null;     // Tag for Center
        nearby_hospital_id?: string | null; // Tag for Hospital
        placement_site_id?: string | null;  // Tag for Placement
        name: string;
        location: string;
        price_per_night: number;
        distance_to_center: string;
        contact_phone: string;
        contact_name: string;
        has_wifi: boolean;
        has_water: boolean;
        has_security: boolean;
        notes: string;
        created_by: string;
    }) {
        const { data, error } = await supabase
            .from('oriented_student_housing')
            .insert([
                {
                    ...formData,
                    price_per_night: Math.round(formData.price_per_night),
                    verified: false,
                    safety_rating: 3
                }
            ])
            .select();

        if (error) throw error;
        return data;
    },
};