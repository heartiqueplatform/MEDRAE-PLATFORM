// src/pages/live-classes/CreateClass.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { liveClassService } from '@/services/liveClassService';
import { toast } from 'sonner';
import {
    X, Upload, Calendar, Clock, Users, Award, Link as LinkIcon,
    BookOpen, Video, Loader2, CheckCircle, ArrowLeft
} from 'lucide-react';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dpj5vprwf';
const CLOUDINARY_UPLOAD_PRESET = 'medrae-classes';

export const CreateClass = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string>('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        topic_category: '',
        meeting_link: '',
        meeting_platform: 'google_meet',
        meeting_id: '',
        meeting_password: '',
        class_date: '',
        start_time: '',
        end_time: '',
        host_name: profile?.name || '',
        max_students: 50,
        is_cpd_eligible: false,
        cpd_points: 0,
        cpd_accreditation_number: '',
        prerequisites: '',
        learning_objectives: '',
    });

    const topicCategories = [
        'Nursing Fundamentals',
        'Medical-Surgical Nursing',
        'Pediatric Nursing',
        'Maternal & Newborn Nursing',
        'Psychiatric Nursing',
        'Pharmacology',
        'Community Health Nursing',
        'Leadership & Management',
        'Research & Evidence-Based Practice',
        'Critical Care Nursing',
        'Emergency Nursing',
        'Oncology Nursing',
        'Geriatric Nursing',
        'Other'
    ];

    const meetingPlatforms = [
        { value: 'google_meet', label: 'Google Meet' },
        { value: 'zoom', label: 'Zoom' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'other', label: 'Other' },
    ];

    // Upload image to Cloudinary
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'medrae/classes');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setImageFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            setCoverPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        toast.success('Image selected. Will upload when you create the class.');
    };

    const removeImage = () => {
        setImageFile(null);
        setCoverPreview('');
        setUploadedImageUrl('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.title.trim()) {
                toast.error('Title is required');
                setLoading(false);
                return;
            }

            if (!formData.class_date) {
                toast.error('Class date is required');
                setLoading(false);
                return;
            }

            if (!formData.start_time || !formData.end_time) {
                toast.error('Start and end times are required');
                setLoading(false);
                return;
            }

            if (!formData.host_name) {
                toast.error('Host name is required');
                setLoading(false);
                return;
            }

            if (formData.start_time >= formData.end_time) {
                toast.error('End time must be after start time');
                setLoading(false);
                return;
            }

            let imageUrl = uploadedImageUrl;

            if (imageFile && !uploadedImageUrl) {
                setUploadingImage(true);
                try {
                    imageUrl = await uploadToCloudinary(imageFile);
                    setUploadedImageUrl(imageUrl);
                    toast.success('Image uploaded successfully');
                } catch (error) {
                    toast.error('Failed to upload image. Class will be created without image.');
                    imageUrl = '';
                } finally {
                    setUploadingImage(false);
                }
            }

            const submitData = {
                title: formData.title,
                description: formData.description,
                topic_category: formData.topic_category,
                meeting_link: formData.meeting_link,
                meeting_platform: formData.meeting_platform,
                meeting_id: formData.meeting_id,
                meeting_password: formData.meeting_password,
                class_date: formData.class_date,
                start_time: formData.start_time + ':00',
                end_time: formData.end_time + ':00',
                host_name: formData.host_name,
                host_user_id: user?.id,
                max_students: parseInt(formData.max_students.toString()),
                is_cpd_eligible: formData.is_cpd_eligible,
                cpd_points: parseFloat(formData.cpd_points.toString()),
                cpd_accreditation_number: formData.cpd_accreditation_number,
                prerequisites: formData.prerequisites,
                learning_objectives: formData.learning_objectives
                    .split('\n')
                    .filter(obj => obj.trim()),
                cover_image_url: imageUrl || null,
            };

            await liveClassService.createClass(submitData);

            toast.success('Class created successfully');
            navigate('/live-classes');

        } catch (error) {
            console.error('Error creating class:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        // ✅ CHANGED: Removed max-w-2xl, added full width
        <div className="container mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 max-w-full">
            {/* Back Button */}
            <button
                onClick={() => navigate('/live-classes')}
                className="flex items-center gap-1.5 md:gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 md:mb-6 transition-colors px-4 md:px-0"
            >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Back to Classes</span>
            </button>

            {/* Header - Clean, no emojis */}
            <div className="flex flex-col items-center text-center gap-1 md:gap-2 mb-4 md:mb-6 px-4 md:px-0">
                <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg inline-flex">
                    <Video className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Create Live Class</h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Share your knowledge with the community</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-0 md:space-y-4">
                {/* Cover Image Upload - Clean */}
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">
                        Class Cover Image (Optional)
                    </label>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                        {coverPreview ? (
                            <div className="relative w-full md:w-48">
                                <img
                                    src={coverPreview}
                                    alt="Preview"
                                    className="w-full h-32 md:h-32 object-cover rounded-lg border-0"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </button>
                                {uploadingImage && (
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 md:h-8 md:w-8 text-white animate-spin" />
                                    </div>
                                )}
                                {uploadedImageUrl && !uploadingImage && (
                                    <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[8px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                                        Uploaded
                                    </div>
                                )}
                            </div>
                        ) : (
                            <label className="cursor-pointer w-full md:w-48">
                                <div className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 transition-colors">
                                    <Upload className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                                    <span className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Click to upload</span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                            <p>Recommended: 16:9 ratio, max 5MB</p>
                            <p className="text-blue-500">Uploads to Cloudinary when you create the class</p>
                            {imageFile && !uploadedImageUrl && (
                                <p className="text-yellow-500 text-[8px] md:text-xs">
                                    Image selected. Will upload on submit.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Basic Info - Clean */}
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Basic Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Class Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Enter class title"
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Describe what students will learn..."
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="topic_category"
                                value={formData.topic_category}
                                onChange={handleInputChange}
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                            >
                                <option value="">Select category</option>
                                {topicCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Host Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="host_name"
                                value={formData.host_name}
                                onChange={handleInputChange}
                                placeholder="Your name"
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Date & Time - Clean */}
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                        <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                        Date & Time
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="class_date"
                                value={formData.class_date}
                                onChange={handleInputChange}
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleInputChange}
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                End Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleInputChange}
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Meeting Details - Clean */}
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                        <LinkIcon className="h-4 w-4 md:h-5 md:w-5" />
                        Meeting Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Platform
                            </label>
                            <select
                                name="meeting_platform"
                                value={formData.meeting_platform}
                                onChange={handleInputChange}
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            >
                                {meetingPlatforms.map(platform => (
                                    <option key={platform.value} value={platform.value}>
                                        {platform.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Meeting Link <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="url"
                                name="meeting_link"
                                value={formData.meeting_link}
                                onChange={handleInputChange}
                                placeholder="https://meet.google.com/..."
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Meeting ID (Optional)
                            </label>
                            <input
                                type="text"
                                name="meeting_id"
                                value={formData.meeting_id}
                                onChange={handleInputChange}
                                placeholder="Meeting ID"
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Meeting Password (Optional)
                            </label>
                            <input
                                type="text"
                                name="meeting_password"
                                value={formData.meeting_password}
                                onChange={handleInputChange}
                                placeholder="Password"
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            />
                        </div>
                    </div>
                </div>

                {/* Capacity & CPD - Clean */}
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Capacity & CPD</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                <Users className="h-3.5 w-3.5 md:h-4 md:w-4 inline mr-0.5 md:mr-1" />
                                Max Students
                            </label>
                            <input
                                type="number"
                                name="max_students"
                                value={formData.max_students}
                                onChange={handleInputChange}
                                min={1}
                                max={500}
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            />
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 pt-4 md:pt-6">
                            <input
                                type="checkbox"
                                name="is_cpd_eligible"
                                checked={formData.is_cpd_eligible}
                                onChange={handleInputChange}
                                className="h-4 w-4 md:h-5 md:w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label className="text-[10px] md:text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Award className="h-3.5 w-3.5 md:h-4 md:w-4 inline mr-0.5 md:mr-1" />
                                This class offers CPD points
                            </label>
                        </div>

                        {formData.is_cpd_eligible && (
                            <>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                        CPD Points
                                    </label>
                                    <input
                                        type="number"
                                        name="cpd_points"
                                        value={formData.cpd_points}
                                        onChange={handleInputChange}
                                        min={0}
                                        step={0.5}
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                        Accreditation Number (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        name="cpd_accreditation_number"
                                        value={formData.cpd_accreditation_number}
                                        onChange={handleInputChange}
                                        placeholder="e.g., CPD-2024-001"
                                        className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Prerequisites & Objectives - Clean */}
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                        <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                        Prerequisites & Learning Objectives
                    </h3>

                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Prerequisites (Optional)
                            </label>
                            <textarea
                                name="prerequisites"
                                value={formData.prerequisites}
                                onChange={handleInputChange}
                                rows={2}
                                placeholder="What should students know before joining?"
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 md:mb-1">
                                Learning Objectives (One per line)
                            </label>
                            <textarea
                                name="learning_objectives"
                                value={formData.learning_objectives}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="By the end of this class, students will be able to:"
                                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm md:text-base"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Buttons - Clean */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 px-4 md:px-0 pb-4 md:pb-0">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                                {uploadingImage ? 'Uploading Image...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                                Create Class
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/live-classes')}
                        className="flex-1 px-4 md:px-6 py-2.5 md:py-3 border-0 text-gray-700 dark:bg-muted/60 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm md:text-base"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};