// src/components/stories/StorySkeleton.tsx
import React, { memo } from 'react';

export const StorySkeleton: React.FC = memo(() => {
    return (
        <div className="flex-shrink-0 w-[280px] sm:w-[300px] rounded-xl overflow-hidden shadow-lg bg-white dark:bg-gray-800 animate-pulse">
            <div className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 p-6 min-h-[200px]">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/20 rounded-full" />
                        <div className="w-16 h-5 bg-white/20 rounded-full" />
                    </div>
                    <div className="w-6 h-6 bg-white/20 rounded-full" />
                </div>

                {/* Content */}
                <div className="mt-4 space-y-2">
                    <div className="w-3/4 h-6 bg-white/20 rounded" />
                    <div className="w-full h-4 bg-white/20 rounded" />
                    <div className="w-2/3 h-4 bg-white/20 rounded" />
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="w-24 h-3 bg-white/20 rounded" />
                    <div className="w-20 h-6 bg-white/20 rounded-full" />
                </div>
            </div>

            {/* Reactions Bar */}
            <div className="px-4 py-3 bg-white dark:bg-gray-800 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    ))}
                </div>
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        </div>
    );
});

StorySkeleton.displayName = 'StorySkeleton';

export default StorySkeleton;