// src/components/stories/StoryErrorState.tsx
import React from 'react';

interface StoryErrorStateProps {
    message: string;
    onRetry: () => void;
}


export const StoryErrorState: React.FC<StoryErrorStateProps> = ({ message, onRetry }) => {
    return (
        <div className="text-center py-16 px-4">
            <div className="text-5xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Something Went Wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                {message}
            </p>
            <button
                onClick={onRetry}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
            >
                🔄 Try Again
            </button>
        </div>
    );
};