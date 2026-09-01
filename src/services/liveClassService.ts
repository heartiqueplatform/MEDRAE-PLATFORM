// src/services/liveClassService.ts
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const liveClassService = {
    // Get all classes with registration counts
    async getAllClasses() {
        const { data, error } = await supabase
            .from('live_classes')
            .select(`
        *,
        registrations:class_registrations(count)
      `)
            .order('class_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        return data.map((cls: any) => ({
            ...cls,
            registration_count: cls.registrations?.[0]?.count || 0
        }));
    },

    // Get class by ID
    async getClassById(classId: string) {
        const { data, error } = await supabase
            .from('live_classes')
            .select(`
        *,
        resources:class_resources(*),
        registrations:class_registrations(
          *,
          user_profile:user_id(
            user_id,
            name,
            email,
            avatar_url
          )
        )
      `)
            .eq('id', classId)
            .single();

        if (error) throw error;
        return data;
    },

    // Create class (admin only)
    async createClass(classData: any) {
        const { data, error } = await supabase
            .from('live_classes')
            .insert([classData])
            .select()
            .single();

        if (error) {
            toast.error('Failed to create class');
            throw error;
        }

        toast.success('Class created successfully!');
        return data;
    },

    // Update class (admin only)
    async updateClass(classId: string, updates: any) {
        const { data, error } = await supabase
            .from('live_classes')
            .update(updates)
            .eq('id', classId)
            .select()
            .single();

        if (error) {
            toast.error('Failed to update class');
            throw error;
        }

        toast.success('Class updated successfully!');
        return data;
    },

    // Delete class (admin only)
    async deleteClass(classId: string) {
        const { error } = await supabase
            .from('live_classes')
            .delete()
            .eq('id', classId);

        if (error) {
            toast.error('Failed to delete class');
            throw error;
        }

        toast.success('Class deleted successfully!');
    }
};

export const registrationService = {
    // Register for a class
    async registerForClass(classId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('class_registrations')
            .insert([{
                class_id: classId,
                user_id: user.id,
                attendance_status: 'registered'
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                toast.error('Already registered for this class');
            } else {
                toast.error('Failed to register');
            }
            throw error;
        }

        toast.success('Successfully registered!');
        return data;
    },

    // Cancel registration
    async cancelRegistration(registrationId: string) {
        const { error } = await supabase
            .from('class_registrations')
            .update({ attendance_status: 'cancelled' })
            .eq('id', registrationId);

        if (error) {
            toast.error('Failed to cancel');
            throw error;
        }

        toast.success('Registration cancelled');
    },

    // Get user's registrations
    async getUserRegistrations() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('class_registrations')
            .select(`
        *,
        class:class_id(*)
      `)
            .eq('user_id', user.id)
            .neq('attendance_status', 'cancelled')
            .order('registered_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Mark attendance (admin only)
    async markAttendance(classId: string, userId: string, status: 'attended' | 'missed') {
        const { error } = await supabase
            .from('class_registrations')
            .update({
                attendance_status: status,
                attended_at: status === 'attended' ? new Date().toISOString() : null
            })
            .eq('class_id', classId)
            .eq('user_id', userId);

        if (error) {
            toast.error('Failed to mark attendance');
            throw error;
        }

        toast.success(`Attendance marked as ${status}`);
    }
};