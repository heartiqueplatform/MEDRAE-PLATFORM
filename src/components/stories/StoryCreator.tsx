// src/components/stories/StoryCreator.tsx
import React, { useState } from 'react';
import type { StoryTemplate } from '@/types/stories';
import type { CreateStoryInput } from '@/types/stories';
import { X } from 'lucide-react';

interface StoryCreatorProps {
    templates: StoryTemplate[];
    onCreate: (data: CreateStoryInput) => Promise<void>;
    onClose: () => void;
}


export const StoryCreator: React.FC<StoryCreatorProps> = ({
    templates = [],
    onCreate,
    onClose
}) => {
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);
    const [formData, setFormData] = useState<Partial<CreateStoryInput>>({
        story_type: 'study',
        content: '',
        title: '',
        challenge_target: null,
        challenge_unit: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ensure templates is always an array
    const safeTemplates = Array.isArray(templates) ? templates : [];

    /**
     * Handle template selection
     */
    const handleTemplateSelect = (template: StoryTemplate) => {
        setSelectedTemplate(template);
        setFormData(prev => ({
            ...prev,
            story_type: template.id,
            background_color: template.background_color,
            template_id: template.id
        }));
        setStep(2);
    };

    /**
     * Handle form field changes
     */
    const handleChange = (field: keyof CreateStoryInput, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Handle challenge toggle
     */
    const handleChallengeToggle = (enabled: boolean) => {
        if (enabled) {
            setFormData(prev => ({
                ...prev,
                challenge_target: 10,
                challenge_unit: 'questions',
                challenge_start: new Date().toISOString(),
                challenge_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                challenge_target: null,
                challenge_unit: null,
                challenge_start: null,
                challenge_end: null
            }));
        }
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        // Validate content
        if (!formData.content?.trim()) {
            setError('Please enter some content for your story.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare the data
            const storyData: CreateStoryInput = {
                story_type: formData.story_type || 'study',
                title: formData.title || null,
                content: formData.content.trim(),
                image_url: formData.image_url || null,
                background_color: formData.background_color || null,
                template_id: formData.template_id || null,
                challenge_target: formData.challenge_target || null,
                challenge_unit: formData.challenge_unit || null,
                challenge_start: formData.challenge_start || null,
                challenge_end: formData.challenge_end || null,
                expires_at: formData.expires_at || null
            };

            console.log('Creating story with data:', storyData);
            await onCreate(storyData);
            onClose();
        } catch (err) {
            console.error('Error creating story:', err);
            setError(err instanceof Error ? err.message : 'Failed to create story');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle skip template (go directly to form)
     */
    const handleSkipTemplate = () => {
        setSelectedTemplate({
            id: 'custom',
            name: 'Custom Story',
            icon: '📝',
            background_color: '#4F46E5',
            text_color: '#FFFFFF',
            prompts: ['What do you want to share?']
        });
        setStep(2);
    };

    /**
     * Render step 1: Template selection
     */
    const renderTemplateSelection = () => (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Choose a Template
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Select a template that matches what you want to share
            </p>

            {safeTemplates.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No templates available</p>
                    <button
                        type="button"
                        onClick={handleSkipTemplate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Continue without template
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {safeTemplates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => handleTemplateSelect(template)}
                                className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                            >
                                <div className="text-3xl mb-2">{template.icon}</div>
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {template.name}
                                </div>
                                <div
                                    className="w-full h-1 mt-2 rounded-full"
                                    style={{ backgroundColor: template.background_color }}
                                />
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleSkipTemplate}
                        className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        Or create a custom story
                    </button>
                </>
            )}
        </div>
    );

    /**
     * Render step 2: Story creation form
     */
    const renderStoryForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {selectedTemplate?.icon} {selectedTemplate?.name || 'Create Story'}
                        </h2>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title (Optional)
                    </label>
                    <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Add a title to your story"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        maxLength={100}
                    />
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.content || ''}
                        onChange={(e) => handleChange('content', e.target.value)}
                        placeholder={selectedTemplate?.prompts?.[0] || 'What do you want to share?'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        rows={4}
                        maxLength={200}
                        required
                    />
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formData.content?.length || 0}/200
                    </div>
                </div>

                {/* Challenge Toggle */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <input
                        type="checkbox"
                        id="challenge-toggle"
                        checked={formData.challenge_target !== null}
                        onChange={(e) => handleChallengeToggle(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="challenge-toggle" className="text-sm text-gray-700 dark:text-gray-300">
                        Make this a challenge
                    </label>
                </div>

                {/* Challenge Details */}
                {formData.challenge_target !== null && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Target
                            </label>
                            <input
                                type="number"
                                value={formData.challenge_target || 0}
                                onChange={(e) => handleChange('challenge_target', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                min={1}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Unit
                            </label>
                            <input
                                type="text"
                                value={formData.challenge_unit || ''}
                                onChange={(e) => handleChange('challenge_unit', e.target.value)}
                                placeholder="e.g., questions, hours"
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                required
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !formData.content?.trim()}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Creating...' : 'Post Story'}
                </button>
            </div>

            {error && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    {error}
                </div>
            )}
        </form>
    );

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    e.stopPropagation();
                    onClose();
                }
            }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {step === 1 ? renderTemplateSelection() : renderStoryForm()}
            </div>
        </div>
    );
};

// ✅ Named export
export { StoryCreator as default };