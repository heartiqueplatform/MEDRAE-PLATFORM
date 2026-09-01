// src/components/stories/StoryEmptyState.tsx
import React from 'react';

interface StoryEmptyStateProps {
    onCreateClick: () => void;
    userProfile?: {
        avatar_url?: string | null;
        name?: string | null;
        username?: string | null;
    } | null;
}

export const StoryEmptyState: React.FC<StoryEmptyStateProps> = ({
    onCreateClick,
    userProfile
}) => {
    const avatarUrl = userProfile?.avatar_url || '/high3.png';

    return (
        // Added min-h-[100px] to ensure the section never collapses to 0px height
        <div className="flex gap-4 overflow-x-auto px-4 pb-2 custom-scrollbar touch-pan-x min-h-[100px]">

            {/* Your Story Avatar */}
            <div
                className="flex-shrink-0 flex flex-col items-center gap-1 group cursor-pointer"
                style={{ width: '72px' }} // FIX: Explicit width for mobile browsers
                onClick={onCreateClick}
            >
                <div className="relative w-16 h-16 rounded-full p-[2px] bg-gray-200 dark:bg-gray-700 group-hover:bg-indigo-500 transition-colors flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[2px] flex items-center justify-center overflow-hidden relative">
                        <img
                            src={avatarUrl}
                            className="w-full h-full object-cover opacity-70"
                            alt="Your Story"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-indigo-600 text-white rounded-full p-1 border-2 border-white dark:border-gray-800 shadow-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate w-16 text-center">
                    Your Story
                </span>
            </div>

            {/* Empty message - Added flex-shrink-0 to prevent text squashing */}
            <div className="flex-shrink-0 flex items-center px-2">
                <p className="text-sm text-gray-400 dark:text-gray-500 italic whitespace-nowrap">
                    No stories yet. Tap + to share!
                </p>
            </div>
        </div>
    );
};
export default StoryEmptyState;