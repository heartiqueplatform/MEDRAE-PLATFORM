// src/hooks/useGroupPay.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { grouppayService } from '@/services/grouppayService';
import { StudyGroup } from '@/types/grouppay';
import { toast } from 'sonner';

export function useGroupPay() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<StudyGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        school: '',
        course: '',
        sort: 'newest'
    });

    // Load initial data
    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = useCallback(async () => {
        try {
            setLoading(true);
            const data = await grouppayService.getGroups(filters);
            setGroups(data);
        } catch (error) {
            console.error('Error loading groups:', error);
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const createGroup = async (groupData: {
        name: string;
        school: string;
        max_members: number;
        description?: string;
        contribution_per_member?: number;
    }) => {
        if (!user) {
            toast.error('Please log in to create a group');
            return null;
        }

        try {
            const newGroup = await grouppayService.createGroup(groupData, user.id);
            toast.success('Group created successfully!');
            await loadGroups();
            return newGroup;
        } catch (error: any) {
            console.error('Error creating group:', error);
            toast.error(error.message || 'Failed to create group');
            return null;
        }
    };

    const joinGroup = async (groupId: string) => {
        if (!user) {
            toast.error('Please log in to join a group');
            return false;
        }

        try {
            await grouppayService.addMemberToGroup(groupId, user.id);
            toast.success('Joined group successfully!');
            await loadGroups();
            return true;
        } catch (error: any) {
            console.error('Error joining group:', error);
            toast.error(error.message || 'Failed to join group');
            return false;
        }
    };

    const joinGroupByCode = async (groupCode: string) => {
        if (!user) {
            toast.error('Please log in to join a group');
            return false;
        }

        try {
            const group = await grouppayService.getGroupByCode(groupCode);
            if (!group) {
                toast.error('Group not found');
                return false;
            }

            await grouppayService.addMemberToGroup(group.id, user.id);
            toast.success('Joined group successfully!');
            await loadGroups();
            return true;
        } catch (error: any) {
            console.error('Error joining group by code:', error);
            toast.error(error.message || 'Failed to join group');
            return false;
        }
    };

    const leaveGroup = async (groupId: string) => {
        if (!user) {
            toast.error('Please log in');
            return false;
        }

        try {
            await grouppayService.removeMemberFromGroup(groupId, user.id);
            toast.success('Left group successfully');
            await loadGroups();
            return true;
        } catch (error: any) {
            console.error('Error leaving group:', error);
            toast.error(error.message || 'Failed to leave group');
            return false;
        }
    };

    const deleteGroup = async (groupId: string) => {
        if (!user) {
            toast.error('Please log in');
            return false;
        }

        try {
            await grouppayService.deleteGroup(groupId, user.id);
            toast.success('Group deleted successfully');
            await loadGroups();
            return true;
        } catch (error: any) {
            console.error('Error deleting group:', error);
            toast.error(error.message || 'Failed to delete group');
            return false;
        }
    };

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // Load groups when filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            loadGroups();
        }, 300);

        return () => clearTimeout(timer);
    }, [filters.search, filters.school, filters.course, filters.sort]);

    return {
        groups,
        loading,
        filters,
        createGroup,
        joinGroup,
        joinGroupByCode,
        leaveGroup,
        deleteGroup,
        updateFilters,
        refreshGroups: loadGroups,
    };
}