// src/services/grouppayService.ts

import { supabase } from '@/lib/supabaseClient';
import { StudyGroup, GroupMember } from '@/types/grouppay';

export const grouppayService = {
    // Get all groups with optional filters
    async getGroups(filters?: {
        search?: string;
        school?: string;
        course?: string;
        sort?: string;
    }): Promise<StudyGroup[]> {
        let query = supabase
            .from('grouppay_groups')
            .select(`
                *,
                creator:profiles!created_by (
                    name,
                    avatar_url
                ),
                members:grouppay_members (
                    id,
                    user_id,
                    role,
                    joined_at,
                    profile:profiles!user_id (
                        name,
                        avatar_url
                    )
                )
            `)
            .neq('status', 'closed');

        // Apply filters
        if (filters?.search) {
            query = query.ilike('group_name', `%${filters.search}%`);
        }

        if (filters?.school) {
            query = query.ilike('school', `%${filters.school}%`);
        }

        // Apply sorting
        if (filters?.sort) {
            switch (filters.sort) {
                case 'most_members':
                    query = query.order('current_members', { ascending: false });
                    break;
                case 'least_members':
                    query = query.order('current_members', { ascending: true });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'oldest':
                    query = query.order('created_at', { ascending: true });
                    break;
                default:
                    query = query.order('created_at', { ascending: false });
            }
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching groups:', error);
            throw error;
        }

        return data || [];
    },

    // Get a single group by ID
    async getGroupById(groupId: string): Promise<StudyGroup | null> {
        const { data, error } = await supabase
            .from('grouppay_groups')
            .select(`
                *,
                creator:profiles!created_by (
                    name,
                    avatar_url
                ),
                members:grouppay_members (
                    id,
                    user_id,
                    role,
                    joined_at,
                    profile:profiles!user_id (
                        name,
                        avatar_url
                    )
                )
            `)
            .eq('id', groupId)
            .single();

        if (error) {
            console.error('Error fetching group:', error);
            return null;
        }

        return data;
    },

    // Get a group by code
    async getGroupByCode(groupCode: string): Promise<StudyGroup | null> {
        const { data, error } = await supabase
            .from('grouppay_groups')
            .select(`
                *,
                creator:profiles!created_by (
                    name,
                    avatar_url
                ),
                members:grouppay_members (
                    id,
                    user_id,
                    role,
                    joined_at,
                    profile:profiles!user_id (
                        name,
                        avatar_url
                    )
                )
            `)
            .eq('group_code', groupCode)
            .single();

        if (error) {
            console.error('Error fetching group by code:', error);
            return null;
        }

        return data;
    },

    // Create a new group
    // Create a new group
    async createGroup(groupData: {
        name: string;
        school: string;
        max_members: number;
        description?: string;
        contribution_per_member?: number;
        leader_phone?: string;      // ✅ NEW
        leader_whatsapp?: string;   // ✅ NEW
        leader_email?: string;      // ✅ NEW
    }, creatorId: string): Promise<StudyGroup> {
        try {
            // Generate a unique group code
            const codePrefix = 'MEDRAE';
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const groupCode = `${codePrefix}-${randomNum}`;

            console.log('Creating group with data:', {
                group_name: groupData.name,
                school: groupData.school,
                created_by: creatorId,
                max_members: groupData.max_members,
                group_code: groupCode,
                leader_phone: groupData.leader_phone,
                leader_whatsapp: groupData.leader_whatsapp,
                leader_email: groupData.leader_email,
            });

            // Start with 0 - trigger will increment when we add the creator as a member
            const { data: newGroup, error: groupError } = await supabase
                .from('grouppay_groups')
                .insert({
                    group_name: groupData.name,
                    school: groupData.school,
                    description: groupData.description || null,
                    created_by: creatorId,
                    max_members: groupData.max_members,
                    group_code: groupCode,
                    contribution_per_member: groupData.contribution_per_member || 100,
                    current_members: 0, // Start at 0, trigger will add 1
                    status: 'open',
                    is_locked: false,
                    // ✅ NEW: Contact fields
                    leader_phone: groupData.leader_phone || null,
                    leader_whatsapp: groupData.leader_whatsapp || null,
                    leader_email: groupData.leader_email || null,
                })
                .select()
                .single();

            if (groupError) {
                console.error('Error creating group:', groupError);
                throw groupError;
            }

            console.log('Group created successfully:', newGroup);

            // Add the creator as a member - trigger will increment current_members to 1
            const { error: memberError } = await supabase
                .from('grouppay_members')
                .insert({
                    group_id: newGroup.id,
                    user_id: creatorId,
                    role: 'leader',
                });

            if (memberError) {
                console.error('Error adding creator as member:', memberError);
                // Rollback: delete the group if we can't add the creator
                await supabase.from('grouppay_groups').delete().eq('id', newGroup.id);
                throw new Error('Failed to add creator as member');
            }

            console.log('Creator added as member successfully');

            // Wait a moment for the trigger to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch the complete group with relations
            const { data: completeData, error: fetchError } = await supabase
                .from('grouppay_groups')
                .select(`
                *,
                creator:profiles!created_by (
                    name,
                    avatar_url
                ),
                members:grouppay_members (
                    id,
                    user_id,
                    role,
                    joined_at,
                    profile:profiles!user_id (
                        name,
                        avatar_url
                    )
                )
            `)
                .eq('id', newGroup.id)
                .single();

            if (fetchError) {
                console.error('Error fetching complete group:', fetchError);
                return {
                    ...newGroup,
                    creator: null,
                    members: []
                } as StudyGroup;
            }

            console.log('Complete group data:', completeData);
            return completeData;

        } catch (error) {
            console.error('Error in createGroup:', error);
            throw error;
        }
    },
    // Add a member to a group - Trigger handles increment
    async addMemberToGroup(groupId: string, userId: string, role: 'leader' | 'member' = 'member'): Promise<void> {
        try {
            console.log('Adding member to group:', { groupId, userId, role });

            // Check if user is already a member
            const { data: existingMember, error: checkError } = await supabase
                .from('grouppay_members')
                .select('id')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .single();

            if (existingMember) {
                throw new Error('You are already a member of this group');
            }

            // Check if group is full
            const { data: group, error: groupError } = await supabase
                .from('grouppay_groups')
                .select('current_members, max_members')
                .eq('id', groupId)
                .single();

            if (groupError) {
                throw groupError;
            }

            console.log('Current group state:', group);

            if (group.current_members >= group.max_members) {
                throw new Error('This group is full');
            }

            // Add member - trigger will handle incrementing current_members
            const { error: insertError } = await supabase
                .from('grouppay_members')
                .insert({
                    group_id: groupId,
                    user_id: userId,
                    role: role,
                });

            if (insertError) {
                console.error('Error adding member:', insertError);
                throw insertError;
            }

            console.log('Member added successfully');

        } catch (error) {
            console.error('Error in addMemberToGroup:', error);
            throw error;
        }
    },

    // Remove a member from a group - Trigger handles decrement
    async removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
        try {
            console.log('Removing member from group:', { groupId, userId });

            // Check if user is the leader
            const { data: member, error: memberError } = await supabase
                .from('grouppay_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', userId)
                .single();

            if (memberError) {
                throw memberError;
            }

            if (member.role === 'leader') {
                throw new Error('Group leader cannot leave. Transfer leadership first or delete the group.');
            }

            // Get current member count before deletion
            const { data: group, error: groupError } = await supabase
                .from('grouppay_groups')
                .select('current_members')
                .eq('id', groupId)
                .single();

            if (groupError) {
                throw groupError;
            }

            console.log('Current group state before removal:', group);

            // Remove member - trigger will handle decrementing current_members
            const { error: deleteError } = await supabase
                .from('grouppay_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (deleteError) {
                console.error('Error removing member:', deleteError);
                throw deleteError;
            }

            console.log('Member removed successfully');

        } catch (error) {
            console.error('Error in removeMemberFromGroup:', error);
            throw error;
        }
    },

    // Check if user is a member of a group
    async isUserMember(groupId: string, userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('grouppay_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error checking membership:', error);
        }

        return !!data;
    },

    // Get user's role in a group
    async getUserRole(groupId: string, userId: string): Promise<'leader' | 'member' | null> {
        const { data, error } = await supabase
            .from('grouppay_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (error) {
            return null;
        }

        return data?.role || null;
    },

    // Delete a group (only leader can do this)
    async deleteGroup(groupId: string, userId: string): Promise<void> {
        try {
            console.log('Deleting group:', { groupId, userId });

            // Check if user is the creator/leader
            const { data: group, error: groupError } = await supabase
                .from('grouppay_groups')
                .select('created_by')
                .eq('id', groupId)
                .single();

            if (groupError) {
                throw groupError;
            }

            if (group.created_by !== userId) {
                throw new Error('Only the group leader can delete this group');
            }

            // Delete the group - this will cascade delete members and payments
            const { error: deleteError } = await supabase
                .from('grouppay_groups')
                .delete()
                .eq('id', groupId);

            if (deleteError) {
                console.error('Error deleting group:', deleteError);
                throw deleteError;
            }

            console.log('Group deleted successfully');

        } catch (error) {
            console.error('Error in deleteGroup:', error);
            throw error;
        }
    },

    // Update group status
    async updateGroupStatus(groupId: string, status: 'open' | 'payment_pending' | 'active' | 'closed'): Promise<void> {
        const { error } = await supabase
            .from('grouppay_groups')
            .update({ status })
            .eq('id', groupId);

        if (error) {
            console.error('Error updating group status:', error);
            throw error;
        }
    },

    // Toggle group lock
    async toggleGroupLock(groupId: string, isLocked: boolean): Promise<void> {
        const { error } = await supabase
            .from('grouppay_groups')
            .update({ is_locked: isLocked })
            .eq('id', groupId);

        if (error) {
            console.error('Error toggling group lock:', error);
            throw error;
        }
    },

    // Get groups created by a user
    async getUserGroups(userId: string): Promise<StudyGroup[]> {
        const { data, error } = await supabase
            .from('grouppay_groups')
            .select(`
                *,
                creator:profiles!created_by (
                    name,
                    avatar_url
                ),
                members:grouppay_members (
                    id,
                    user_id,
                    role,
                    joined_at,
                    profile:profiles!user_id (
                        name,
                        avatar_url
                    )
                )
            `)
            .eq('created_by', userId)
            .neq('status', 'closed')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user groups:', error);
            return [];
        }

        return data || [];
    },

    // Get groups a user is a member of
    async getUserMemberGroups(userId: string): Promise<StudyGroup[]> {
        const { data, error } = await supabase
            .from('grouppay_members')
            .select(`
                group:grouppay_groups (
                    *,
                    creator:profiles!created_by (
                        name,
                        avatar_url
                    ),
                    members:grouppay_members (
                        id,
                        user_id,
                        role,
                        joined_at,
                        profile:profiles!user_id (
                            name,
                            avatar_url
                        )
                    )
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching user member groups:', error);
            return [];
        }

        return data.map(item => item.group).filter(Boolean);
    },

    // Get total number of groups a user has created
    async getUserGroupCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('grouppay_groups')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .neq('status', 'closed');

        if (error) {
            console.error('Error fetching user group count:', error);
            return 0;
        }

        return count || 0;
    },

    // Get total number of groups a user has joined
    async getUserMemberGroupCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('grouppay_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching user member group count:', error);
            return 0;
        }

        return count || 0;
    },

    // Fix group count if it's out of sync
    async fixGroupCount(groupId: string): Promise<void> {
        try {
            // Get actual member count
            const { count, error: countError } = await supabase
                .from('grouppay_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', groupId);

            if (countError) {
                console.error('Error counting members:', countError);
                throw countError;
            }

            // Update current_members to actual count
            const { error: updateError } = await supabase
                .from('grouppay_groups')
                .update({ current_members: count || 0 })
                .eq('id', groupId);

            if (updateError) {
                console.error('Error fixing group count:', updateError);
                throw updateError;
            }

            console.log(`Group ${groupId} count fixed to ${count}`);

        } catch (error) {
            console.error('Error in fixGroupCount:', error);
            throw error;
        }
    },

    // ==========================================================
    // GROUPPAY PAYMENT METHODS
    // ==========================================================
    // src/services/grouppayService.ts - Updated initiateGroupPayment

    // Initiate group payment
    async initiateGroupPayment(
        groupId: string,
        userId: string,
        phoneNumber: string
    ): Promise<{ checkoutRequestId: string; paymentId: string }> {
        try {
            console.log('📤 initiateGroupPayment called with:', {
                groupId,
                userId,
                phoneNumber,
                userIdType: typeof userId,
                groupIdType: typeof groupId
            });

            // Validate inputs
            if (!groupId) {
                throw new Error('Group ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }
            if (!phoneNumber || phoneNumber.length < 10) {
                throw new Error('Valid phone number is required');
            }

            // Get group details
            const { data: group, error: groupError } = await supabase
                .from('grouppay_groups')
                .select('created_by, status, current_members, contribution_per_member')
                .eq('id', groupId)
                .single();

            if (groupError) {
                console.error('Error fetching group:', groupError);
                throw groupError;
            }

            console.log('📊 Group data:', group);

            // Verify user is group leader
            if (group.created_by !== userId) {
                throw new Error('Only the group leader can initiate payment');
            }

            // Check if group is already active
            if (group.status === 'active') {
                throw new Error('Group is already active');
            }

            // Calculate total amount
            const totalAmount = group.current_members * group.contribution_per_member;
            console.log(`💰 Total amount: ${totalAmount} (${group.current_members} members × ${group.contribution_per_member})`);

            // Generate checkout request ID
            const checkoutRequestId = `GP_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create payment record
            const { data: payment, error: paymentError } = await supabase
                .from('grouppay_payments')
                .insert({
                    group_id: groupId,
                    payer_user_id: userId,
                    amount: totalAmount,
                    phone_number: phoneNumber,
                    checkout_request_id: checkoutRequestId,
                    status: 'pending'
                })
                .select()
                .single();

            if (paymentError) {
                console.error('Error creating payment record:', paymentError);
                throw paymentError;
            }

            console.log('✅ Payment record created:', payment);

            // Update group status to payment_pending
            await supabase
                .from('grouppay_groups')
                .update({
                    status: 'payment_pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', groupId);

            // Call the GroupPay STK Push edge function
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grouppay-stk-push`;
            console.log(`📤 Calling edge function: ${functionUrl}`);

            // IMPORTANT: Use 'phone' key (not 'phoneNumber') to match the edge function
            const requestBody = {
                phone: phoneNumber,  // ✅ Changed from phoneNumber to phone
                amount: totalAmount,
                userId: userId,      // ✅ Add userId
                groupId: groupId,
                paymentId: payment.id
            };

            console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            console.log('📥 Edge function response:', result);

            if (!response.ok) {
                // If STK push fails, update payment status
                await supabase
                    .from('grouppay_payments')
                    .update({
                        status: 'failed',
                        result_desc: result.error || result.details || 'STK push failed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', payment.id);

                throw new Error(result.error || result.details || 'Failed to initiate M-Pesa STK push');
            }

            console.log(`📱 M-Pesa STK Push initiated for ${phoneNumber}: ${checkoutRequestId}`);

            return {
                checkoutRequestId: checkoutRequestId,
                paymentId: payment.id
            };

        } catch (error) {
            console.error('❌ Error initiating group payment:', error);
            throw error;
        }
    },
    // Check payment status
    async getGroupPaymentStatus(groupId: string): Promise<{
        status: string;
        total_amount: number;
        paid_amount: number;
        members_count: number;
        is_successful: boolean;
        payment_date?: string;
        mpesa_receipt?: string;
        checkout_request_id?: string;
        result_desc?: string;
    }> {
        try {
            // Get latest payment
            const { data: payment, error: paymentError } = await supabase
                .from('grouppay_payments')
                .select('*')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (paymentError) throw paymentError;

            // Get group info
            const { data: group, error: groupError } = await supabase
                .from('grouppay_groups')
                .select('current_members, status, contribution_per_member')
                .eq('id', groupId)
                .single();

            if (groupError) throw groupError;

            return {
                status: payment?.status || 'pending',
                total_amount: group.current_members * group.contribution_per_member,
                paid_amount: payment?.amount || 0,
                members_count: group.current_members,
                is_successful: payment?.status === 'success',
                payment_date: payment?.payment_date,
                mpesa_receipt: payment?.mpesa_receipt,
                checkout_request_id: payment?.checkout_request_id,
                result_desc: payment?.result_desc
            };

        } catch (error) {
            console.error('Error getting group payment status:', error);
            throw error;
        }
    },

    // Get payment history for a group
    async getGroupPaymentHistory(groupId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('grouppay_payments')
                .select(`
                    *,
                    payer:profiles!payer_user_id (
                        name,
                        email,
                        avatar_url
                    )
                `)
                .eq('group_id', groupId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Error getting payment history:', error);
            throw error;
        }
    },

    // Get group members with subscription status
    async getGroupMembersWithStatus(groupId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('grouppay_members')
                .select(`
                    *,
                    profile:profiles!user_id (
                        name,
                        email,
                        avatar_url,
                        has_active_subscription,
                        subscription_role,
                        subscription_expires_at
                    )
                `)
                .eq('group_id', groupId);

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Error getting group members with status:', error);
            throw error;
        }
    },

    // Check if group is active (all members have premium)
    async isGroupActive(groupId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('grouppay_groups')
                .select('status')
                .eq('id', groupId)
                .single();

            if (error) throw error;
            return data?.status === 'active';

        } catch (error) {
            console.error('Error checking group status:', error);
            return false;
        }
    },

    // Retry failed payment
    async retryGroupPayment(groupId: string, userId: string): Promise<{ checkoutRequestId: string }> {
        try {
            // Get the failed payment
            const { data: payment, error: paymentError } = await supabase
                .from('grouppay_payments')
                .select('*')
                .eq('group_id', groupId)
                .eq('status', 'failed')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (paymentError) throw paymentError;

            // Generate new checkout request ID
            const newCheckoutRequestId = `GP_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Update payment with new checkout ID and reset status
            const { error: updateError } = await supabase
                .from('grouppay_payments')
                .update({
                    checkout_request_id: newCheckoutRequestId,
                    status: 'pending',
                    result_code: null,
                    result_desc: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', payment.id);

            if (updateError) throw updateError;

            // Update group status back to payment_pending
            await supabase
                .from('grouppay_groups')
                .update({
                    status: 'payment_pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', groupId);

            // Re-initiate STK push
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grouppay-stk-push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    phoneNumber: payment.phone_number,
                    amount: payment.amount,
                    checkoutRequestId: newCheckoutRequestId,
                    paymentId: payment.id,
                    groupId: groupId,
                    isRetry: true
                })
            });

            if (!response.ok) {
                throw new Error('Failed to retry M-Pesa STK push');
            }

            return { checkoutRequestId: newCheckoutRequestId };

        } catch (error) {
            console.error('Error retrying payment:', error);
            throw error;
        }
    },

    // Get payment confirmation for a specific member
    async getMemberPaymentConfirmation(groupId: string, userId: string): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('grouppay_payments')
                .select('*')
                .eq('group_id', groupId)
                .eq('payer_user_id', userId)
                .eq('status', 'success')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Error getting member payment confirmation:', error);
            return null;
        }
    }
};