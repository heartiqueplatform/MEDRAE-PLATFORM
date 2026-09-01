// hooks/useResuscitationLink.ts
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useResuscitationLink = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        restoredStreak?: number;
    } | null>(null);
    const processedRef = useRef(false);

    const processResuscitationLink = useCallback(async (params: {
        share_id: string;
        streak: string;
        user_id: string;
    }) => {
        // Prevent duplicate processing
        if (processedRef.current) {
            console.log('⏭️ Already processed this link, skipping');
            return;
        }

        console.log('🔄 Processing resuscitation link with params:', params);

        processedRef.current = true;
        setIsProcessing(true);

        try {
            // Call the resuscitate_streak function with the user_id from the link
            console.log('🔄 Calling resuscitate_streak for user:', params.user_id);

            const { data: resuscitateData, error: resuscitateError } = await supabase
                .rpc('resuscitate_streak', {
                    user_id_param: params.user_id
                });

            if (resuscitateError) {
                console.error('❌ Error resuscitating:', resuscitateError);
                setResult({
                    success: false,
                    message: 'Failed to restore streak. Please try again.'
                });
                setIsProcessing(false);
                return;
            }

            console.log('📊 Resuscitate response:', resuscitateData);

            if (!resuscitateData || !resuscitateData[0]?.success) {
                setResult({
                    success: false,
                    message: resuscitateData?.[0]?.message || 'Failed to restore streak'
                });
                setIsProcessing(false);
                return;
            }

            // Record the resuscitation with the share_id
            const { error: recordError } = await supabase
                .rpc('record_streak_resuscitation', {
                    user_id_param: params.user_id,
                    shared_with: [params.share_id, 'link_tap']
                });

            if (recordError) {
                console.error('Error recording:', recordError);
            }

            const restoredStreak = resuscitateData[0].restored_streak;
            console.log('✅ Streak restored! New streak:', restoredStreak);

            setResult({
                success: true,
                message: `✅ The ${params.streak}-day streak has been restored! 🎉`,
                restoredStreak: restoredStreak
            });

            // Clear the URL params
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
                console.log('🧹 URL params cleared');
            }

        } catch (error) {
            console.error('❌ Error processing link:', error);
            setResult({
                success: false,
                message: 'Something went wrong. Please try again.'
            });
        } finally {
            setIsProcessing(false);
        }
    }, []);

    // Check URL params on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const resuscitate = params.get('resuscitate');
        const share_id = params.get('share_id');
        const streak = params.get('streak');
        const user_id = params.get('user_id');

        console.log('🔍 Checking URL params:', {
            resuscitate,
            share_id,
            streak,
            user_id,
            fullUrl: window.location.href
        });

        if (resuscitate === 'true' && share_id && streak && user_id) {
            console.log('✅ Detected resuscitation link! Processing immediately...');

            // Process immediately - no login needed!
            setTimeout(() => {
                processResuscitationLink({ share_id, streak, user_id });
            }, 500);
        }
    }, [processResuscitationLink]);

    return {
        isProcessing,
        result,
        setResult,
        processResuscitationLink
    };
};