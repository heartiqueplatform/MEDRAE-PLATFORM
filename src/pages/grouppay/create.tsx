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
    Calendar,
    ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    GROUPPAY_CONFIG,
    GroupDuration,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
    getMonthlyRate,
} from '@/types/grouppay';

export default function CreateGroupPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { createGroup } = useGroupPay();
    const [loading, setLoading] = useState(false);

    // Duration toggle state — defaults to 2-months (better value)
    const [selectedDuration, setSelectedDuration] = useState<GroupDuration>('2-months');

    const [formData, setFormData] = useState({
        name: '',
        school: '',
        // ✅ CHANGED: use DEFAULT_MAX_MEMBERS as the form prefill
        max_members: String(GROUPPAY_CONFIG.DEFAULT_MAX_MEMBERS),
        description: '',
        leader_phone: '',
        leader_whatsapp: '',
        leader_email: '',
    });

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

    // Dynamic price based on selected duration
    const pricePerMember = useMemo(
        () => getGroupPricePerMember(selectedDuration),
        [selectedDuration]
    );
    const individualPrice = useMemo(
        () => getIndividualPrice(selectedDuration),
        [selectedDuration]
    );
    const savingsPerMember = useMemo(
        () => getSavingsPerMember(selectedDuration),
        [selectedDuration]
    );
    const monthlyRate = useMemo(
        () => getMonthlyRate(selectedDuration),
        [selectedDuration]
    );

    const totalGroupCost = useMemo(
        () => maxMembers * pricePerMember,
        [maxMembers, pricePerMember]
    );
    const totalSavings = useMemo(
        () => maxMembers * savingsPerMember,
        [maxMembers, savingsPerMember]
    );

    const durationLabel = selectedDuration === '1-month' ? '1 Month' : '2 Months';

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
            toast.error(`Group size must be between ${GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT} and ${GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT}`);
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
                contribution_per_member: pricePerMember,
                duration_type: selectedDuration,
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
    }, [user, formData, isMaxMembersValid, isPhoneValid, isWhatsappValid, maxMembers, pricePerMember, selectedDuration, createGroup, navigate]);

    return (
        <div className="min-h-screen w-full bg-slate-50/50 dark:bg-background pb-16 md:pb-10">
            <div className="w-full md:max-w-2xl md:mx-auto md:px-4 md:pt-6">

                {/* Back button */}
                <div className="px-4 md:px-0 pt-4 md:pt-0 pb-2">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/grouppay')}
                        className="inline-flex w-fit items-center justify-center p-1.5 -ml-1.5 text-slate-700 dark:text-slate-200 active:opacity-60 transition"
                    >
                        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />

                    </Button>
                </div>

                {/* MAIN CARD */}
                <Card className="border-0 rounded-none md:rounded-2xl bg-white dark:bg-muted/30 shadow-none md:shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500" />

                    <CardHeader className="pb-4 px-4 md:px-6 pt-5 md:pt-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 leading-tight">
                                    <Users2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                                    <span className="truncate">Create a Study Group</span>
                                </CardTitle>
                                <CardDescription className="text-xs md:text-sm mt-1.5">
                                    Form a study group and save up to 50% on premium access
                                </CardDescription>
                            </div>
                            <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-[10px] font-black uppercase tracking-wider border-0 flex-shrink-0">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Save 50%
                            </Badge>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5 px-4 md:px-6">

                            {/* DURATION TOGGLE */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    Plan Duration *
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* 1 Month option */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDuration('1-month')}
                                        className={`relative p-3.5 rounded-xl border-0 text-left transition-all duration-200 ${selectedDuration === '1-month'
                                            ? 'bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500/40'
                                            : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-bold ${selectedDuration === '1-month' ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                1 Month
                                            </span>
                                            {selectedDuration === '1-month' && (
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`text-lg font-bold tabular-nums ${selectedDuration === '1-month' ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                                                {GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.PRICE_PER_MEMBER_1_MONTH}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">/person</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-through mt-0.5">
                                            {GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.INDIVIDUAL_PRICE_1_MONTH} solo
                                        </p>
                                    </button>

                                    {/* 2 Months option */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDuration('2-months')}
                                        className={`relative p-3.5 rounded-xl border-0 text-left transition-all duration-200 ${selectedDuration === '2-months'
                                            ? 'bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500/40'
                                            : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                                            }`}
                                    >
                                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                                            SAVE
                                        </span>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-bold ${selectedDuration === '2-months' ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                2 Months
                                            </span>
                                            {selectedDuration === '2-months' && (
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`text-lg font-bold tabular-nums ${selectedDuration === '2-months' ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                                                {GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.PRICE_PER_MEMBER_2_MONTHS}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">/person</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-through mt-0.5">
                                            {GROUPPAY_CONFIG.CURRENCY} {GROUPPAY_CONFIG.INDIVIDUAL_PRICE_2_MONTHS} solo
                                        </p>
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Info className="w-3 h-3 flex-shrink-0" />
                                    <span>
                                        {durationLabel} plan · Save {GROUPPAY_CONFIG.CURRENCY} {savingsPerMember}/person · Only {GROUPPAY_CONFIG.CURRENCY} {monthlyRate}/month
                                    </span>
                                </p>
                            </div>

                            {/* Leader responsibilities notice */}
                            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border-0">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                            Group Leader Responsibilities
                                        </p>
                                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
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
                                    className="text-base h-11 md:h-10 rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-green-500/40"
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
                                    className="text-base h-11 md:h-10 rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-green-500/40"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter your school or institution name
                                </p>
                            </div>

                            {/* Group Size — renamed from "Maximum Members" for clarity */}
                            <div className="space-y-2">
                                <Label htmlFor="max_members" className="flex items-center gap-2 text-sm font-medium">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    Group Size *
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="max_members"
                                        type="number"
                                        min={GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT}
                                        max={GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT}
                                        placeholder={`${GROUPPAY_CONFIG.DEFAULT_MAX_MEMBERS} recommended`}
                                        value={formData.max_members}
                                        onChange={handleInputChange}
                                        className={`text-base h-11 md:h-10 rounded-xl border-0 pr-20 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 ${!isMaxMembersValid && formData.max_members
                                            ? 'focus-visible:ring-red-500/40'
                                            : 'focus-visible:ring-green-500/40'
                                            }`}
                                        required
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                        members
                                    </span>
                                </div>

                                {/* ✅ CHANGED: simpler, honest copy — activation = fill the group */}
                                <div className="flex items-center gap-2 text-xs">
                                    {maxMembers > 0 ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                    ) : (
                                        <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <span className={maxMembers > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                                        {maxMembers > 0
                                            ? `Your group activates once all ${maxMembers} slots are filled`
                                            : `Pick how many members you want in the group`}
                                    </span>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Choose carefully — smaller groups activate faster. Max {GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT} members.
                                </p>
                            </div>

                            {/* Price Per Member — dynamic by duration */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium">
                                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                                    Price Per Member ({durationLabel})
                                </Label>
                                <div className="flex flex-wrap items-center gap-3 p-3.5 bg-green-50 dark:bg-green-950/30 rounded-xl border-0">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                            {GROUPPAY_CONFIG.CURRENCY} {pricePerMember}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground line-through">
                                        {GROUPPAY_CONFIG.CURRENCY} {individualPrice}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] border-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                        Save {GROUPPAY_CONFIG.CURRENCY} {savingsPerMember}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Info className="w-3 h-3 flex-shrink-0" />
                                    <span>Price is set by the plan duration. <span className="font-medium">Save {savingsPerMember} KSh per member!</span></span>
                                </p>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-3 pt-2">
                                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                                <div className="flex items-center gap-2 pt-2">
                                    <Phone className="w-4 h-4 text-green-600" />
                                    <h4 className="font-semibold text-sm">Contact Information</h4>
                                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-0 bg-slate-100 dark:bg-slate-800">
                                        Required
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-1">
                                    Share your contact details so members can send contributions via M-Pesa
                                </p>

                                {/* Leader Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor="leader_phone" className="flex items-center gap-2 text-sm font-medium">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        Phone Number (M-Pesa) *
                                    </Label>
                                    <Input
                                        id="leader_phone"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="0712345678"
                                        value={formData.leader_phone}
                                        onChange={handlePhoneChange}
                                        className={`text-base h-11 md:h-10 rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 ${!isPhoneValid && formData.leader_phone
                                            ? 'focus-visible:ring-red-500/40'
                                            : 'focus-visible:ring-green-500/40'
                                            }`}
                                        maxLength={12}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Members will send their contributions to this number via M-Pesa
                                    </p>
                                </div>

                                {/* WhatsApp */}
                                <div className="space-y-2">
                                    <Label htmlFor="leader_whatsapp" className="flex items-center gap-2 text-sm font-medium">
                                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                                        WhatsApp Number
                                    </Label>
                                    <Input
                                        id="leader_whatsapp"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="0712345678"
                                        value={formData.leader_whatsapp}
                                        onChange={handlePhoneChange}
                                        className={`text-base h-11 md:h-10 rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 ${!isWhatsappValid && formData.leader_whatsapp
                                            ? 'focus-visible:ring-red-500/40'
                                            : 'focus-visible:ring-green-500/40'
                                            }`}
                                        maxLength={12}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Optional: For group communication and updates
                                    </p>
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="leader_email" className="flex items-center gap-2 text-sm font-medium">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        Email Address
                                    </Label>
                                    <Input
                                        id="leader_email"
                                        type="email"
                                        inputMode="email"
                                        placeholder="your.email@example.com"
                                        value={formData.leader_email}
                                        onChange={handleInputChange}
                                        className="text-base h-11 md:h-10 rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-green-500/40"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Optional: For official communications
                                    </p>
                                </div>
                            </div>

                            {/* Total cost preview */}
                            {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT && (
                                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl border-0 space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Plan</span>
                                        <span className="font-medium">{durationLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Group Size</span>
                                        <span className="font-medium">{maxMembers}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Price Per Member</span>
                                        <span className="font-medium">
                                            {GROUPPAY_CONFIG.CURRENCY} {pricePerMember}
                                            <span className="text-[10px] text-muted-foreground line-through ml-1.5 opacity-60">
                                                {GROUPPAY_CONFIG.CURRENCY} {individualPrice}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-px bg-blue-200 dark:bg-blue-800/30 my-1" />
                                    <div className="flex items-center justify-between text-base font-bold">
                                        <span>Total Group Cost</span>
                                        <span className="text-green-600 dark:text-green-400 tabular-nums">
                                            {GROUPPAY_CONFIG.CURRENCY} {totalGroupCost.toLocaleString()}
                                        </span>
                                    </div>
                                    {maxMembers >= GROUPPAY_CONFIG.MIN_MEMBERS_LIMIT && (
                                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 pt-1">
                                            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>You're saving {GROUPPAY_CONFIG.CURRENCY} {totalSavings.toLocaleString()} compared to {durationLabel} individual plans!</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Trust & Safety */}
                            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 rounded-xl border-0">
                                <div className="flex items-start gap-2.5">
                                    <Shield className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-red-700 dark:text-red-400">
                                            Trust & Safety
                                        </p>
                                        <ul className="text-xs text-red-600/80 dark:text-red-400/80 space-y-0.5 leading-relaxed">
                                            <li>• Only collect contributions from members you know personally</li>
                                            <li>• Medrae does not handle individual member contributions</li>
                                            <li>• All disputes between members must be resolved directly</li>
                                            <li>• Report any suspicious activity to Medrae support</li>
                                        </ul>
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
                                    className="text-base resize-none rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-green-500/40"
                                />
                            </div>

                            {/* ✅ CHANGED: How GroupPay Works — reflects fill-to-activate model */}
                            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl border-0">
                                <div className="flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                            How GroupPay Works
                                        </p>
                                        <ol className="text-xs text-blue-600/80 dark:text-blue-400/80 space-y-0.5 leading-relaxed list-none">
                                            <li>1. Create a group with your classmates</li>
                                            <li>2. Share your phone number for contributions</li>
                                            <li>3. Members send their {GROUPPAY_CONFIG.CURRENCY} {pricePerMember} contribution to you</li>
                                            <li>4. Once all {maxMembers || 'group'} slots are filled, you activate with one payment</li>
                                            <li>5. Everyone gets {durationLabel} premium access instantly!</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        {/* Footer */}
                        <CardFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-2 pb-5 px-4 md:px-6 border-0 bg-transparent">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/grouppay')}
                                className="w-full sm:w-auto sm:flex-1 h-12 md:h-11 rounded-xl border-0 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full sm:w-auto sm:flex-1 h-12 md:h-11 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold border-0"
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
                                        Create {durationLabel} Group
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Pro Tips — ✅ CHANGED: reflects fill-to-activate model */}
                <div className="mx-4 md:mx-0 mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border-0">
                    <div className="flex items-start gap-2.5">
                        <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                Pro Tips for Group Leaders
                            </p>
                            <ul className="text-xs text-amber-600/80 dark:text-amber-400/80 space-y-0.5 leading-relaxed">
                                <li>• Only collect money from members you know and trust</li>
                                <li>• Keep a record of who has paid and who hasn't</li>
                                <li>• Share your phone number clearly with all members</li>
                                <li>• Once all slots are filled, activate the group with one payment</li>
                                <li>• Smaller groups activate faster — pick a size you can actually fill</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}