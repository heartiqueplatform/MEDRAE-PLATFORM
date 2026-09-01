// src/pages/grouppay/create.tsx

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useGroupPay } from '@/hooks/useGroupPay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Users,
    School,
    FileText,
    DollarSign,
    Info,
    CheckCircle,
    AlertCircle,
    Users2,
    TrendingUp,
    Lock,
    Sparkles,
    Phone,
    MessageCircle,
    Mail,
    AlertTriangle,
    Shield,
    UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { GROUPPAY_CONFIG } from '@/types/grouppay';

export default function CreateGroupPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { createGroup } = useGroupPay();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        school: '',
        max_members: String(GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED),
        description: '',
        leader_phone: '',
        leader_whatsapp: '',
        leader_email: '',
    });

    // ============================================================
    // MEMOIZED VALIDATIONS
    // ============================================================
    const maxMembers = useMemo(() => parseInt(formData.max_members) || 0, [formData.max_members]);

    const isMaxMembersValid = useMemo(() => {
        return maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT &&
            maxMembers <= GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT;
    }, [maxMembers]);

    const isPhoneValid = useMemo(() => {
        if (!formData.leader_phone) return false;
        const cleaned = formData.leader_phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 12;
    }, [formData.leader_phone]);

    const isWhatsappValid = useMemo(() => {
        if (!formData.leader_whatsapp) return true;
        const cleaned = formData.leader_whatsapp.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 12;
    }, [formData.leader_whatsapp]);

    const isFormValid = useMemo(() => {
        return formData.name.trim().length > 0 &&
            formData.school.trim().length > 0 &&
            isMaxMembersValid &&
            isPhoneValid &&
            isWhatsappValid;
    }, [formData.name, formData.school, isMaxMembersValid, isPhoneValid, isWhatsappValid]);

    const totalGroupCost = useMemo(() => maxMembers * GROUPPAY_CONFIG.PRICE_PER_MEMBER, [maxMembers]);
    const individualCost = 199;
    const savingsPerMember = individualCost - GROUPPAY_CONFIG.PRICE_PER_MEMBER;
    const totalSavings = useMemo(() => maxMembers * savingsPerMember, [maxMembers]);

    // ============================================================
    // HANDLERS
    // ============================================================
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    }, []);

    const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const cleaned = value.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [id]: cleaned }));
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error('Please log in to create a group');
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        if (!formData.school.trim()) {
            toast.error('Please enter your school name');
            return;
        }

        if (!isMaxMembersValid) {
            toast.error(`Maximum members must be between ${GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT} and ${GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT}`);
            return;
        }

        if (!isPhoneValid) {
            toast.error('Please enter a valid phone number (e.g., 0712345678)');
            return;
        }

        if (!isWhatsappValid) {
            toast.error('Please enter a valid WhatsApp number (e.g., 0712345678)');
            return;
        }

        setLoading(true);

        try {
            const newGroup = await createGroup({
                name: formData.name.trim(),
                school: formData.school.trim(),
                max_members: maxMembers,
                description: formData.description.trim() || undefined,
                contribution_per_member: GROUPPAY_CONFIG.PRICE_PER_MEMBER,
                leader_phone: formData.leader_phone.trim(),
                leader_whatsapp: formData.leader_whatsapp.trim() || undefined,
                leader_email: formData.leader_email.trim() || undefined,
            });

            if (newGroup) {
                toast.success('Group created successfully!');
                navigate(`/grouppay/${newGroup.id}`);
            }
        } catch (error) {
            console.error('Error creating group:', error);
            toast.error('Failed to create group. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, formData, isMaxMembersValid, isPhoneValid, isWhatsappValid, maxMembers, createGroup, navigate]);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
            <Button
                variant="ghost"
                onClick={() => navigate('/grouppay')}
                className="mb-4 md:mb-6 gap-2 text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Groups
            </Button>

            <Card className="border-2 border-green-100 dark:border-green-900/30">
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                <Users2 className="w-6 h-6 text-green-600" />
                                Create a Study Group
                            </CardTitle>
                            <CardDescription className="text-sm mt-1.5">
                                Form a study group and save up to 50% on premium access
                            </CardDescription>
                        </div>
                        <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-[10px] font-black uppercase tracking-wider border-0">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Save 50%
                        </Badge>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5">
                        {/* ⚠️ Warning Banner - Group Leader Responsibilities */}
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                        Group Leader Responsibilities
                                    </p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                                        As the group leader, you will collect contributions from members via M-Pesa.
                                        Only collect from members you know personally. Medrae is not responsible
                                        for disputes between members.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Group Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                Group Name *
                            </Label>
                            <Input
                                id="name"
                                placeholder="e.g., KMTC Embu Revision Group"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="text-base"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Choose a descriptive name for your study group
                            </p>
                        </div>

                        {/* School */}
                        <div className="space-y-2">
                            <Label htmlFor="school" className="flex items-center gap-2 text-sm font-medium">
                                <School className="w-4 h-4 text-muted-foreground" />
                                School / Institution *
                            </Label>
                            <Input
                                id="school"
                                placeholder="e.g., KMTC Embu, University of Nairobi"
                                value={formData.school}
                                onChange={handleInputChange}
                                className="text-base"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter your school or institution name
                            </p>
                        </div>

                        {/* Maximum Members */}
                        <div className="space-y-2">
                            <Label htmlFor="max_members" className="flex items-center gap-2 text-sm font-medium">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                Maximum Members *
                            </Label>
                            <div className="relative">
                                <Input
                                    id="max_members"
                                    type="number"
                                    min={GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT}
                                    max={GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT}
                                    placeholder={`${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED} recommended`}
                                    value={formData.max_members}
                                    onChange={handleInputChange}
                                    className={`text-base pr-16 ${!isMaxMembersValid && formData.max_members ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    members
                                </span>
                            </div>

                            {/* Member count feedback */}
                            <div className="flex items-center gap-2 text-xs">
                                {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                ) : maxMembers > 0 ? (
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <span className={`
                                    ${maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED ? 'text-green-700 dark:text-green-400' : ''}
                                    ${maxMembers > 0 && maxMembers < GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED ? 'text-amber-700 dark:text-amber-400' : ''}
                                    ${maxMembers === 0 ? 'text-muted-foreground' : ''}
                                `}>
                                    {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED
                                        ? `Ready! ${maxMembers} members (${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}+ recommended for best savings)`
                                        : maxMembers > 0
                                            ? `Need ${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED - maxMembers} more members to reach ${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}`
                                            : `Minimum ${GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT}, recommended ${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}+`
                                    }
                                </span>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Groups with <span className="font-medium text-green-600">{GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}+</span> members get the best savings
                            </p>
                        </div>

                        {/* Fixed Price */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                Price Per Member
                            </Label>
                            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                        {GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.PRICE_PER_MEMBER}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground line-through">
                                    {GROUPPAY_CONFIG.CURRENCY} 199
                                </span>
                                <Badge variant="outline" className="text-[9px] border-green-500 text-green-600 dark:text-green-400">
                                    Save 50%
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Price is fixed and cannot be changed. <span className="font-medium">Save {savingsPerMember} KSh per member!</span>
                            </p>
                        </div>

                        {/* ============================================================ */}
                        {/* 📞 Contact Information - New Section */}
                        {/* ============================================================ */}
                        <div className="space-y-3 pt-2 border-t border-muted">
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-600" />
                                <h4 className="font-semibold text-sm">Contact Information</h4>
                                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                                    Required
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground -mt-1">
                                Share your contact details so members can send contributions via M-Pesa
                            </p>

                            {/* Leader Phone - Required */}
                            <div className="space-y-2">
                                <Label htmlFor="leader_phone" className="flex items-center gap-2 text-sm font-medium">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    Phone Number (M-Pesa) *
                                </Label>
                                <Input
                                    id="leader_phone"
                                    type="tel"
                                    placeholder="0712345678"
                                    value={formData.leader_phone}
                                    onChange={handlePhoneChange}
                                    className={`text-base ${!isPhoneValid && formData.leader_phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    maxLength={12}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Members will send their contributions to this number via M-Pesa
                                </p>
                            </div>

                            {/* Leader WhatsApp - Optional */}
                            <div className="space-y-2">
                                <Label htmlFor="leader_whatsapp" className="flex items-center gap-2 text-sm font-medium">
                                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                                    WhatsApp Number
                                </Label>
                                <Input
                                    id="leader_whatsapp"
                                    type="tel"
                                    placeholder="0712345678"
                                    value={formData.leader_whatsapp}
                                    onChange={handlePhoneChange}
                                    className={`text-base ${!isWhatsappValid && formData.leader_whatsapp ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    maxLength={12}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional: For group communication and updates
                                </p>
                            </div>

                            {/* Leader Email - Optional */}
                            <div className="space-y-2">
                                <Label htmlFor="leader_email" className="flex items-center gap-2 text-sm font-medium">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    Email Address
                                </Label>
                                <Input
                                    id="leader_email"
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={formData.leader_email}
                                    onChange={handleInputChange}
                                    className="text-base"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional: For official communications
                                </p>
                            </div>
                        </div>

                        {/* Show total cost & savings preview */}
                        {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Total Members</span>
                                    <span className="font-medium">{maxMembers}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Price Per Member</span>
                                    <span className="font-medium">{GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.PRICE_PER_MEMBER}</span>
                                </div>
                                <div className="flex items-center justify-between text-base font-bold pt-1 border-t border-blue-200 dark:border-blue-800/30">
                                    <span>Total Group Cost</span>
                                    <span className="text-green-600 dark:text-green-400">
                                        {GROUPPAY_CONFIG.CURRENCY} {totalGroupCost.toLocaleString()}
                                    </span>
                                </div>
                                {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED && (
                                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        <span>You're saving {GROUPPAY_CONFIG.CURRENCY} {totalSavings.toLocaleString()} compared to individual plans!</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🔒 Trust & Safety Warning */}
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Shield className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-red-700 dark:text-red-400">
                                        Trust & Safety
                                    </p>
                                    <p className="text-xs text-red-600/80 dark:text-red-400/80">
                                        • Only collect contributions from members you know personally<br />
                                        • Medrae does not handle individual member contributions<br />
                                        • All disputes between members must be resolved directly<br />
                                        • Report any suspicious activity to Medrae support
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Description (Optional)
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the purpose of your study group..."
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="text-base resize-none"
                            />
                        </div>

                        {/* Info Banner */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                        How GroupPay Works
                                    </p>
                                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                        1. Create a group with your classmates<br />
                                        2. Share your phone number for contributions<br />
                                        3. Members send their {GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.PRICE_PER_MEMBER} contribution to you<br />
                                        4. Once everyone has paid, you activate the group with one payment<br />
                                        5. Everyone gets premium access instantly!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/grouppay')}
                            className="w-full sm:w-auto sm:flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto sm:flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold"
                            disabled={loading || !isFormValid}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Users2 className="w-4 h-4 mr-2" />
                                    Create Group
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* Pro Tips Section */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Pro Tips for Group Leaders
                        </p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                            • Only collect money from members you know and trust<br />
                            • Keep a record of who has paid and who hasn't<br />
                            • Share your phone number clearly with all members<br />
                            • Once everyone has paid, activate the group with one payment<br />
                            • Groups with {GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}+ members save the most!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}