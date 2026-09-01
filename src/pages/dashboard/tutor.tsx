"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Users, Clock, Loader2, GraduationCap, UserPlus, Plus,
  BookOpen, School, Trash2, Edit2, Send, MessageCircle,
  CheckCircle, XCircle
} from "lucide-react";
import CohortAnnouncement from "@/components/CohortAnnouncement";
import DailyStatus from "@/components/DailyStatus";

import FloatingQuickActions from "@/components/FloatingQuickActions";
import { TermsButton } from "@/components/ui/TermsButton";
import TutorQuickAction from "@/components/exams/TutorQuickAction";
import { TutorShare } from "@/components/exams/TutorShare";

// ============================================
// TYPES
// ============================================

interface TutorClass {
  id: string;
  tutor_id: string;
  block: string;
  year: number;
  semester: number;
  class_name?: string;
  description?: string;
  max_students?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

// ============================================
// OPTIMIZATIONS - Cache all students with 24-hour TTL
// ============================================
const STUDENTS_CACHE_KEY = "tutor_all_students_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let cachedStudents: any[] | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;

const getCachedStudents = (): any[] | null => {
  try {
    const cached = localStorage.getItem(STUDENTS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const saveStudentsToCache = (students: any[]) => {
  try {
    localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify({
      data: students,
      timestamp: Date.now()
    }));
    cachedStudents = students;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error("Failed to cache students:", error);
  }
};

const cohortColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-yellow-500", "bg-pink-500"];

// ✅ Preload background images
const preloadImages = () => {
  if (typeof window === "undefined") return;

  const imagesToPreload = ["/tutor.png", "/linked.png"];
  imagesToPreload.forEach((src) => {
    const img = new Image();
    img.src = src;
    img.loading = "eager";
  });
};

if (typeof window !== "undefined") {
  preloadImages();
}

// ============================================
// CREATE CLASS MODAL
// ============================================

const CreateClassModal = ({
  isOpen,
  onClose,
  tutorId,
  onClassCreated,
  editingClass
}: {
  isOpen: boolean;
  onClose: () => void;
  tutorId: string;
  onClassCreated: () => void;
  editingClass?: TutorClass | null;
}) => {
  const [block, setBlock] = useState("");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingClass) {
      setBlock(editingClass.block);
      setYear(editingClass.year);
      setSemester(editingClass.semester);
      setClassName(editingClass.class_name || "");
      setDescription(editingClass.description || "");
      setMaxStudents(editingClass.max_students || 50);
    }
  }, [editingClass]);

  useEffect(() => {
    if (!isOpen) {
      setBlock("");
      setYear(1);
      setSemester(1);
      setClassName("");
      setDescription("");
      setMaxStudents(50);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!block || !year || !semester) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      if (editingClass) {
        const { error } = await supabase
          .from("tutor_classes")
          .update({
            block: block.toUpperCase(),
            year,
            semester,
            class_name: className || `Class ${block.toUpperCase()} - Year ${year} Semester ${semester}`,
            description: description || undefined,
            max_students: maxStudents,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingClass.id)
          .eq("tutor_id", tutorId);

        if (error) throw error;
        toast.success("✅ Class updated successfully!");
      } else {
        const { error } = await supabase
          .from("tutor_classes")
          .insert({
            tutor_id: tutorId,
            block: block.toUpperCase(),
            year,
            semester,
            class_name: className || `Class ${block.toUpperCase()} - Year ${year} Semester ${semester}`,
            description: description || undefined,
            max_students: maxStudents,
            is_active: true
          });

        if (error) throw error;
        toast.success("🎉 Class created successfully!");
      }

      onClassCreated();
      onClose();
    } catch (error: any) {
      console.error("Error saving class:", error);
      toast.error("Failed to save class: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
                {editingClass ? <Edit2 className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingClass ? 'Edit Class' : 'Create New Class'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {editingClass ? 'Update your class details' : 'Set up a new class for your students'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Block *</Label>
                <Input
                  placeholder="e.g., A1, B2"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="border-slate-200 dark:border-white/10 focus:ring-emerald-500/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Semester *</Label>
                <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
                  <SelectTrigger className="border-slate-200 dark:border-white/10">
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Year *</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="border-slate-200 dark:border-white/10">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(y => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Name (Optional)</Label>
              <Input
                placeholder="e.g., NCK Prep Class A"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="border-slate-200 dark:border-white/10 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description (Optional)</Label>
              <Textarea
                placeholder="Describe what this class covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-slate-200 dark:border-white/10 focus:ring-emerald-500/50 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Max Students</Label>
              <Input
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(Number(e.target.value))}
                className="border-slate-200 dark:border-white/10 focus:ring-emerald-500/50"
                min={1}
                max={200}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingClass ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingClass ? 'Update Class' : 'Create Class'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SEND MESSAGE MODAL
// ============================================

const SendMessageModal = ({
  isOpen,
  onClose,
  classData,
  onMessageSent
}: {
  isOpen: boolean;
  onClose: () => void;
  classData: TutorClass | null;
  onMessageSent: () => void;
}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !classData) {
      toast.error("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("cohort_messages")
        .insert({
          tutor_id: classData.tutor_id,
          block: classData.block,
          year: classData.year,
          semester: classData.semester,
          message: message.trim()
        });

      if (error) throw error;

      toast.success(`📨 Message sent to ${classData.class_name || classData.block} class!`);
      setMessage("");
      onMessageSent();
      onClose();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Send Announcement
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  To: {classData?.class_name || `Block ${classData?.block}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                📌 This message will be sent to all students in this cohort
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</Label>
              <Textarea
                placeholder="Type your announcement here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border-slate-200 dark:border-white/10 focus:ring-blue-500/50 min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>📤 Students will receive this as a notification</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="flex-[2] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Message
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TutorDashboard() {
  const user = useUser();

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [tutorName, setTutorName] = useState("");

  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showStudentOverlay, setShowStudentOverlay] = useState(false);

  // Classes state
  const [tutorClasses, setTutorClasses] = useState<TutorClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<TutorClass | null>(null);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [selectedClassForMessage, setSelectedClassForMessage] = useState<TutorClass | null>(null);

  // Student selection state - NOW USING CLASS DROPDOWN
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [overlayOpened, setOverlayOpened] = useState(false);

  // ✅ Initialize from cache
  const [allStudents, setAllStudents] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const cached = getCachedStudents();
      if (cached) {
        cachedStudents = cached;
        cacheTimestamp = Date.now();
        return cached;
      }
    }
    return [];
  });

  const [loadingOverlayStudents, setLoadingOverlayStudents] = useState(false);
  const [joining, setJoining] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Get selected class data
  const selectedClass = useMemo(() => {
    return tutorClasses.find(c => c.id === selectedClassId);
  }, [tutorClasses, selectedClassId]);

  // Memoized filtered students for performance
  const filteredStudents = useMemo(() => {
    if (!search) return allStudents;
    const lowerSearch = search.toLowerCase();
    return allStudents.filter((s) =>
      s.name?.toLowerCase().includes(lowerSearch) ||
      s.username?.toLowerCase().includes(lowerSearch) ||
      s.email?.toLowerCase().includes(lowerSearch)
    );
  }, [allStudents, search]);

  // Memoized grouped students for performance
  const groupedStudents = useMemo(() => {
    return Object.entries(
      linkedStudents.reduce((acc: any, s) => {
        const key = `Block ${s.block} - Year ${s.year} - Sem ${s.semester}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
      }, {})
    );
  }, [linkedStudents]);

  useEffect(() => {
    if (user?.id) {
      fetchTutorName();
      fetchLoginStreak();
      fetchLinkedStudents();
      fetchTutorClasses();
      if (allStudents.length === 0) {
        fetchAllStudents();
      }
    }
  }, [user?.id]);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchTutorName = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user?.id)
      .single();
    setTutorName(error ? "Tutor" : data?.name || "Tutor");
  }, [user?.id]);

  const fetchLoginStreak = useCallback(async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: lastLogin } = await supabase
      .from("login_activity")
      .select("*")
      .eq("user_id", user.id)
      .order("login_date", { ascending: false })
      .limit(1);

    let newStreak = 1;
    let previousBest = 1;

    if (lastLogin && lastLogin.length > 0) {
      const last = lastLogin[0];
      const lastDate = new Date(last.login_date);
      const diffDays = Math.floor(
        (new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        newStreak = last.streak || 1;
        previousBest = last.best_streak || newStreak;
      } else if (diffDays === 1) {
        newStreak = (last.streak || 0) + 1;
        previousBest = Math.max(last.best_streak || 0, newStreak);
      } else {
        newStreak = 1;
        previousBest = last.best_streak || 1;
      }
    }

    await supabase
      .from("login_activity")
      .upsert(
        {
          user_id: user.id,
          login_date: today,
          streak: newStreak,
          best_streak: previousBest,
        },
        { onConflict: "user_id,login_date" }
      );

    setStreak(newStreak);
    setBestStreak(previousBest);
  }, [user?.id]);

  const fetchTutorClasses = useCallback(async () => {
    if (!user?.id) return;

    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from("tutor_classes")
        .select("*")
        .eq("tutor_id", user.id)
        .eq("is_active", true)
        .order("year", { ascending: false })
        .order("semester", { ascending: false })
        .order("block", { ascending: true });

      if (error) throw error;

      const { data: studentsData, error: studentsError } = await supabase
        .from("tutor_students")
        .select("tutor_id, block, year, semester, student_id")
        .eq("tutor_id", user.id);

      if (!studentsError && studentsData) {
        const countMap: Record<string, number> = {};
        studentsData.forEach((entry) => {
          const key = `${entry.tutor_id}-${entry.block}-${entry.year}-${entry.semester}`;
          countMap[key] = (countMap[key] || 0) + 1;
        });

        const classesWithCounts = (data || []).map(cls => {
          const key = `${cls.tutor_id}-${cls.block}-${cls.year}-${cls.semester}`;
          return {
            ...cls,
            student_count: countMap[key] || 0
          };
        });

        setTutorClasses(classesWithCounts);
      } else {
        setTutorClasses(data || []);
      }
    } catch (error: any) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes: " + error.message);
    } finally {
      setLoadingClasses(false);
    }
  }, [user?.id]);

  const fetchLinkedStudents = useCallback(async () => {
    setLoadingStudents(true);
    if (!user?.id) return setLoadingStudents(false);

    const { data, error } = await supabase
      .from("tutor_students")
      .select(`
        id,
        student_id,
        tutor_id,
        block,
        year,
        semester,
        profiles!tutor_students_student_id_fkey(name, username)
      `)
      .eq("tutor_id", user.id)
      .order("block", { ascending: true })
      .order("year", { ascending: true })
      .order("semester", { ascending: true });

    if (error) {
      toast.error(error.message);
    }

    setLinkedStudents(data || []);
    setLoadingStudents(false);
  }, [user?.id]);

  const fetchAllStudents = useCallback(async () => {
    const cached = getCachedStudents();
    if (cached && cached.length > 0 && isMounted.current) {
      setAllStudents(cached);
      return;
    }

    if (fetchInProgress) return;
    fetchInProgress = true;

    setLoadingOverlayStudents(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("institution")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.institution) {
        return;
      }

      const { data: students } = await supabase
        .from("profiles")
        .select(`
          user_id,
          name,
          username,
          block,
          county,
          institution,
          course,
          specialization,
          nck_number,
          email,
          phone,
          avatar_url,
          role
        `)
        .eq("role", "student");

      if (isMounted.current && students) {
        setAllStudents(students || []);
        saveStudentsToCache(students || []);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      if (isMounted.current) {
        setLoadingOverlayStudents(false);
      }
      fetchInProgress = false;
    }
  }, [user?.id]);

  // ============================================
  // CLASS MANAGEMENT
  // ============================================

  const handleDeleteClass = useCallback(async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? This will remove all students from this class.")) {
      return;
    }

    try {
      const classToDelete = tutorClasses.find(c => c.id === classId);
      if (classToDelete) {
        await supabase
          .from("tutor_students")
          .delete()
          .eq("tutor_id", user?.id)
          .eq("block", classToDelete.block)
          .eq("year", classToDelete.year)
          .eq("semester", classToDelete.semester);
      }

      const { error } = await supabase
        .from("tutor_classes")
        .delete()
        .eq("id", classId)
        .eq("tutor_id", user?.id);

      if (error) throw error;

      toast.success("Class deleted successfully");
      fetchTutorClasses();
      fetchLinkedStudents();
    } catch (error: any) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class: " + error.message);
    }
  }, [user?.id, tutorClasses, fetchTutorClasses, fetchLinkedStudents]);

  const handleClassCreated = useCallback(() => {
    fetchTutorClasses();
    fetchLinkedStudents();
  }, [fetchTutorClasses, fetchLinkedStudents]);

  const handleMessageSent = useCallback(() => {
    // Refresh or show success
    toast.success("✅ Announcement sent successfully!");
  }, []);

  // ============================================
  // STUDENT MANAGEMENT - UPDATED FOR CLASS DROPDOWN
  // ============================================

  const handleAddStudentsToClass = useCallback(async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student.");
      return;
    }

    if (!selectedClassId) {
      toast.error("Please select a class from the dropdown.");
      return;
    }

    const classData = tutorClasses.find(c => c.id === selectedClassId);
    if (!classData) {
      toast.error("Selected class not found.");
      return;
    }

    setJoining(true);

    const inserts = selectedStudents.map((st) => ({
      tutor_id: user.id,
      student_id: st.user_id,
      block: classData.block,
      year: classData.year,
      semester: classData.semester,
    }));

    const { error } = await supabase
      .from("tutor_students")
      .insert(inserts);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${selectedStudents.length} students added to ${classData.class_name || classData.block}!`);

      // Send a welcome message to the cohort
      const studentNames = selectedStudents.map(s => s.name).join(", ");
      await supabase
        .from("cohort_messages")
        .insert({
          tutor_id: user.id,
          block: classData.block,
          year: classData.year,
          semester: classData.semester,
          message: `👋 Welcome to ${classData.class_name || classData.block}! ${selectedStudents.length} new students have joined: ${studentNames}. Let's get started!`
        });

      setSelectedStudents([]);
      setSelectedClassId("");
      fetchLinkedStudents();
      fetchTutorClasses();
    }

    setJoining(false);
  }, [selectedStudents, selectedClassId, tutorClasses, user?.id, fetchLinkedStudents, fetchTutorClasses]);

  const handleRemoveStudent = useCallback(async (studentId: string) => {
    const { error } = await supabase
      .from("tutor_students")
      .delete()
      .eq("tutor_id", user.id)
      .eq("student_id", studentId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Student removed from your list.");
      setLinkedStudents((prev) => prev.filter((s) => s.student_id !== studentId));
      fetchTutorClasses();
    }
  }, [user?.id, fetchTutorClasses]);

  // Debounced search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.toLowerCase());
  }, []);

  // Clear selection when closing overlay
  const handleCloseOverlay = useCallback(() => {
    setShowStudentOverlay(false);
    setSearch("");
  }, []);

  // ✅ Only fetch when overlay opens for the first time
  useEffect(() => {
    if (showStudentOverlay && !overlayOpened && allStudents.length === 0) {
      setOverlayOpened(true);
      fetchAllStudents();
    }
  }, [showStudentOverlay, overlayOpened, allStudents.length, fetchAllStudents]);

  return (
    <div className="min-h-screen max-w-2xl mx-auto flex justify-center bg-transparent py-0 md:py-1 pt-0 px-0 md:px-2">
      <div className="w-full max-w-none sm:max-w-4xl space-y-0 md:space-y-2">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 md:rounded-xl p-4 md:p-6 text-white md:shadow-lg rounded-none">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">
            Welcome back, {tutorName}! 👨‍⚕️
          </h1>
          <div className="text-white/90 text-xs md:text-sm">
            Here's your impact overview. You can manage your students and cohorts.
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-2">
          <Card className="md:hover:shadow-xl transition-shadow duration-300 border-0 relative overflow-hidden h-56 md:h-64 rounded-none md:rounded-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('/tutor.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-black/40 dark:bg-black/50"></div>
            <CardHeader className="flex items-center justify-between pb-1 md:pb-2 relative z-10 p-4 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-white">Login Streak</CardTitle>
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-300" />
            </CardHeader>
            <CardContent className="relative z-10 p-4 md:p-6 pt-0">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="text-xl md:text-2xl font-bold text-white">{streak} days</div>
                <div className="text-[10px] md:text-xs text-gray-200">Best: {bestStreak} days</div>
              </div>
              <div className="text-[10px] md:text-xs text-gray-200 mt-1">Keep it going!</div>
            </CardContent>
          </Card>

          <Card className="md:hover:shadow-xl transition-shadow duration-300 border-0 relative overflow-hidden h-56 md:h-64 rounded-none md:rounded-xl">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('/linked.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-black/40 dark:bg-black/50"></div>
            <CardHeader className="flex items-center justify-between pb-1 md:pb-2 relative z-10 p-4 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-100">Linked Students</CardTitle>
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-300" />
            </CardHeader>
            <CardContent className="relative z-10 p-4 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold text-white">{linkedStudents.length}</div>
              <div className="text-[10px] md:text-xs text-gray-200">Students in your cohorts</div>
            </CardContent>
          </Card>
        </div>

        <TutorQuickAction />
        <TutorShare />

        {/* ============================================
            MY CLASSES SECTION
            ============================================ */}
        <Card className="md:hover:shadow-xl transition-shadow duration-300 dark:bg-muted/30 border-0 rounded-none md:rounded-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <div className="flex items-center space-x-1.5 md:space-x-2">
              <School className="w-4 h-4 md:w-5 md:h-5 text-slate-900 dark:text-slate-100" />
              <CardTitle className="text-sm md:text-base text-slate-900 dark:text-slate-100">My Classes</CardTitle>
            </div>
            <Button
              onClick={() => {
                setEditingClass(null);
                setShowCreateClassModal(true);
              }}
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              New Class
            </Button>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            {loadingClasses ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-3 border rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
                          <div className="h-2 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tutorClasses.length === 0 ? (
              <div className="text-center py-8">
                <School className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No classes created yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create your first class to start adding students</p>
                <Button
                  onClick={() => {
                    setEditingClass(null);
                    setShowCreateClassModal(true);
                  }}
                  variant="outline"
                  className="mt-4 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Class
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tutorClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 md:p-4 border border-slate-200 dark:border-white/10 rounded-lg md:rounded-xl bg-white/60 dark:bg-muted/30 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-2 h-10 rounded-full ${cohortColors[Math.floor(Math.random() * cohortColors.length)]}`} />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {cls.class_name || `Block ${cls.block}`}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>Block {cls.block}</span>
                            <span>•</span>
                            <span>Year {cls.year}</span>
                            <span>•</span>
                            <span>Sem {cls.semester}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {cls.student_count || 0} students
                            </span>
                          </div>
                          {cls.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {cls.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClassForMessage(cls);
                            setShowSendMessageModal(true);
                          }}
                          className="h-7 w-7 p-0 text-blue-400 hover:text-blue-500"
                          title="Send message to this class"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingClass(cls);
                            setShowCreateClassModal(true);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClass(cls.id)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================
            ADD STUDENT CARD - UPDATED WITH CLASS DROPDOWN
            ============================================ */}
        <Card className="md:hover:shadow-xl transition-shadow duration-300 dark:bg-muted/30 border-0 rounded-none md:rounded-xl border-b border-slate-100 dark:border-slate-800 md:border-b-0">
          <CardHeader className="flex items-center space-x-1.5 md:space-x-2 p-4 md:p-6">
            <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-slate-900 dark:text-slate-100" />
            <CardTitle className="text-sm md:text-base text-slate-900 dark:text-slate-100">Add Students to Your Class</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="flex flex-col space-y-3">
              {/* Class Dropdown - NEW */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Class *</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="border-slate-200 dark:border-white/10 bg-white/60 dark:bg-muted/30">
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tutorClasses.length === 0 ? (
                      <SelectItem value="no-classes" disabled>No classes created yet</SelectItem>
                    ) : (
                      tutorClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.class_name || `Block ${cls.block}`} • Y{cls.year} S{cls.semester} ({cls.student_count || 0} students)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedClass && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Adding to: {selectedClass.class_name || selectedClass.block}
                  </p>
                )}
              </div>

              {/* Student Selector Button */}
              <Button
                onClick={() => setShowStudentOverlay(true)}
                disabled={!selectedClassId}
                className="w-full text-left rounded-lg md:rounded-xl border-0 px-3 py-2 bg-white/60 dark:bg-muted/30 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200 text-xs md:text-sm h-9 md:h-10 disabled:opacity-50"
              >
                {selectedStudents.length > 0
                  ? `${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} selected`
                  : "Select Students"}
              </Button>

              {/* Show selected students count and add button */}
              {selectedStudents.length > 0 && selectedClassId && (
                <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} ready
                    </span>
                  </div>
                  <Button
                    onClick={handleAddStudentsToClass}
                    disabled={joining}
                    className="text-xs h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                  >
                    {joining ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        Add to Class
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {/* Student Overlay - Full Screen Edge to Edge */}
              {showStudentOverlay && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0">
                  <div className="bg-white dark:bg-muted/30 w-full h-full flex flex-col shadow-2xl overflow-hidden">

                    {/* Drag handle for mobile */}
                    <div className="md:hidden flex justify-center pt-3 pb-1">
                      <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                    </div>

                    {/* STICKY HEADER */}
                    <div className="sticky top-0 z-20 bg-white/80 dark:bg-muted/30 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-3 md:p-4 flex items-center justify-between flex-shrink-0">
                      <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">Select Students</h3>
                      <button
                        onClick={handleCloseOverlay}
                        className="text-xl md:text-2xl font-bold text-slate-400 hover:text-red-500 p-1 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* STICKY SEARCH BAR */}
                    <div className="sticky top-[48px] md:top-[64px] z-10 bg-white/80 dark:bg-muted/30 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-2 md:p-3 flex-shrink-0">
                      <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full p-2 rounded-lg border-0 bg-white/60 dark:bg-muted/30 text-slate-900 dark:text-slate-100 text-xs md:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        onChange={handleSearchChange}
                      />
                    </div>

                    {/* STUDENT LIST */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 bg-white dark:bg-muted/30 min-h-0">
                      {loadingOverlayStudents && allStudents.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="p-3 rounded-xl border-0 bg-white/60 dark:bg-muted/30 animate-pulse space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                <div className="space-y-1">
                                  <div className="h-3 md:h-4 w-20 md:w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                  <div className="h-2.5 md:h-3 w-14 md:w-16 bg-slate-200 dark:bg-slate-600 rounded"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredStudents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {filteredStudents.map((s) => {
                            const isSelected = selectedStudents.some(
                              (st) => st.user_id === s.user_id
                            );

                            // Check if student is already in the selected class
                            const isAlreadyInClass = selectedClass && linkedStudents.some(
                              (ls) =>
                                ls.student_id === s.user_id &&
                                ls.block === selectedClass.block &&
                                ls.year === selectedClass.year &&
                                ls.semester === selectedClass.semester
                            );

                            return (
                              <div
                                key={s.user_id}
                                onClick={() => {
                                  if (isAlreadyInClass) {
                                    toast.error(`${s.name} is already in this class`);
                                    return;
                                  }
                                  if (isSelected) {
                                    setSelectedStudents((prev) =>
                                      prev.filter((st) => st.user_id !== s.user_id)
                                    );
                                  } else {
                                    setSelectedStudents((prev) => [...prev, s]);
                                  }
                                }}
                                className={`flex flex-col space-y-1 p-2.5 md:p-3 rounded-lg md:rounded-xl cursor-pointer border-0 transition ${isAlreadyInClass
                                  ? "bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed opacity-50"
                                  : isSelected
                                    ? "bg-indigo-100 dark:bg-indigo-900/50"
                                    : "bg-white/60 dark:bg-muted/30 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                                  }`}
                              >
                                <div className="flex items-center space-x-2 md:space-x-3">
                                  <Avatar className="h-8 w-8 md:h-10 md:w-10">
                                    {s.avatar_url ? (
                                      <img
                                        src={s.avatar_url}
                                        alt={s.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <AvatarFallback>
                                        <img
                                          src="/UsersAvatar.jpg"
                                          alt={s.name}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-medium text-slate-900 dark:text-slate-100 text-xs md:text-sm truncate">
                                      {s.name}
                                    </div>
                                    <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {s.username}
                                    </div>
                                  </div>
                                  {isAlreadyInClass && (
                                    <span className="text-[8px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full ml-auto">
                                      In Class
                                    </span>
                                  )}
                                  {isSelected && !isAlreadyInClass && (
                                    <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 ml-auto" />
                                  )}
                                </div>
                                <div className="text-[10px] md:text-xs text-slate-600 dark:text-slate-300 ml-10 md:ml-12 space-y-0.5">
                                  {s.institution && (
                                    <div className="truncate">
                                      <strong>Inst:</strong> {s.institution}
                                    </div>
                                  )}
                                  {s.course && (
                                    <div className="truncate">
                                      <strong>Course:</strong> {s.course}
                                    </div>
                                  )}
                                  {s.block && (
                                    <div>
                                      <strong>Block:</strong> {s.block}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No students found matching "{search}"
                        </div>
                      )}
                    </div>

                    {/* STICKY BOTTOM BUTTON */}
                    <div className="sticky bottom-0 bg-white/80 dark:bg-muted/30 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 px-3 md:px-4 py-2 md:py-3 flex-shrink-0 flex justify-center">
                      <Button
                        onClick={() => {
                          if (selectedStudents.length === 0) {
                            toast.error("Please select at least one student.");
                            return;
                          }
                          handleCloseOverlay();
                          toast.success(`${selectedStudents.length} students selected.`);
                        }}
                        disabled={selectedStudents.length === 0}
                        className="w-auto min-w-[180px] md:min-w-[200px] text-xs md:text-sm h-8 md:h-9 rounded-lg px-4 md:px-6"
                      >
                        Confirm Selection ({selectedStudents.length})
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <CohortAnnouncement linkedStudents={linkedStudents} colors={cohortColors} />

        {/* Linked Students List */}
        <Card className="md:hover:shadow-xl transition-shadow duration-300 dark:bg-gray-900 border-0 rounded-none md:rounded-xl">
          <CardHeader className="flex items-center space-x-1.5 md:space-x-2 p-4 md:p-6">
            <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-gray-900 dark:text-gray-100" />
            <CardTitle className="text-sm md:text-base text-gray-900 dark:text-gray-100">Your Cohort Students</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            {loadingStudents ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 md:p-3 border rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                      <div className="flex flex-col space-y-1">
                        <div className="h-3 md:h-4 w-20 md:w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        <div className="h-2.5 md:h-3 w-14 md:w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>
                    <div className="h-5 md:h-6 w-12 md:w-14 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : linkedStudents.length === 0 ? (
              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 py-4 text-center">
                No students linked to your cohorts yet.
              </div>
            ) : (
              <>
                {groupedStudents.map(([cohort, students], index) => (
                  <Card key={cohort} className="md:hover:shadow-xl transition-shadow duration-300 mb-2 dark:bg-gray-900 border-0 rounded-lg md:rounded-xl border border-slate-100 dark:border-slate-800 md:border-0">
                    <CardHeader className="flex items-center justify-between p-3 md:p-4">
                      <CardTitle className="text-sm md:text-base text-gray-900 dark:text-gray-100">{cohort}</CardTitle>
                      <span className={`${cohortColors[index % cohortColors.length]} px-2 py-0.5 md:px-2 md:py-1 rounded-lg md:rounded-xl text-white text-[10px] md:text-xs`}>
                        {cohort.split(" - ").join(" | ")}
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-1.5 md:space-y-2 p-3 md:p-4 pt-0">
                      {(students as any[]).map((s) => (
                        <div
                          key={s.student_id}
                          onClick={() => setSelectedUserId(s.student_id)}
                          className="flex items-center justify-between p-2 border rounded-lg md:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                              {s.profiles.avatar_url ? (
                                <img
                                  src={s.profiles.avatar_url}
                                  alt={s.profiles.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <AvatarFallback>
                                  <img
                                    src="/UsersAvatar.jpg"
                                    alt={s.profiles.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-xs md:text-sm truncate">
                                {s.profiles.name}
                              </div>
                              <div className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 truncate">
                                {s.profiles.username}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              const confirmDelete = window.confirm(
                                `Are you sure you want to remove ${s.profiles.name}?`
                              );
                              if (!confirmDelete) return;
                              handleRemoveStudent(s.student_id);
                            }}
                            className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3 flex-shrink-0 ml-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                <UserProfileModal
                  userId={selectedUserId}
                  onClose={() => setSelectedUserId(null)}
                />
              </>
            )}
          </CardContent>
        </Card>
        <DailyStatus />

        {/* Rest of the component remains the same */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full mt-2 px-2 sm:px-0">
          {/* Share Card */}
          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold">Share Medrae</CardTitle>
              </div>
              <CardDescription className="text-xs leading-relaxed mt-2">
                Invite colleagues to join Kenya's premier network for medical education and career growth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                onClick={() => {
                  const shareMessage = `Medrae – The Professional Medical Education & Career Network\n\n• Structured modules\n• Expert-led lectures\n• NCK Exam Prep\n\nJoin today: https://medrae.vercel.app`;
                  if (navigator.share) {
                    navigator.share({ title: "Medrae Network", text: shareMessage, url: "https://medrae.vercel.app" });
                  } else {
                    navigator.clipboard.writeText(shareMessage);
                    alert("Link copied to clipboard!");
                  }
                }}
              >
                Spread the Word
              </Button>
            </CardContent>
          </Card>

          {/* Official Channel Card */}
          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                </div>
                <CardTitle className="text-lg font-bold">Official Channel</CardTitle>
              </div>
              <CardDescription className="text-xs mt-2">
                Instant updates on new study content and professional announcements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="https://whatsapp.com/channel/0029VbBFzgAEawdkJKtRtF2H" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl h-11 font-bold transition-all">
                  Join Channel
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* WhatsApp Group Card */}
          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0a12 12 0 100 24 12 12 0 000-24zm0 22a10 10 0 110-20 10 10 0 010 20z" /></svg>
                </div>
                <CardTitle className="text-lg font-bold">Student Community</CardTitle>
              </div>
              <CardDescription className="text-xs mt-2">
                Connect with peers, share resources, and ask questions in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="https://chat.whatsapp.com/Lad2s4XXx1AA1TtThbMgWV" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl h-11 font-bold transition-all">
                  Join WhatsApp Group
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Telegram & Facebook Card */}
          <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 dark:bg-sky-500/20 rounded-lg text-sky-600">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.28 8.13c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27a.55.55 0 01.01.16z" /></svg>
                </div>
                <CardTitle className="text-lg font-bold">Telegram Hub</CardTitle>
              </div>
              <CardDescription className="text-xs mt-2">
                Access the complete repository of nursing and medical scholarship materials.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <a href="https://t.me/heartiquenursingnexusscholar" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-xl h-11 font-bold transition-all">
                  Telegram
                </Button>
              </a>
              <a href="https://web.facebook.com/share/g/1AY4nC9Hcp/" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl h-11 font-bold transition-all">
                  Facebook
                </Button>
              </a>
            </CardContent>
          </Card>
          <FloatingQuickActions />
        </div>
        <TermsButton />
      </div>

      {/* Create/Edit Class Modal */}
      <CreateClassModal
        isOpen={showCreateClassModal}
        onClose={() => {
          setShowCreateClassModal(false);
          setEditingClass(null);
        }}
        tutorId={user?.id || ""}
        onClassCreated={handleClassCreated}
        editingClass={editingClass}
      />

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={showSendMessageModal}
        onClose={() => {
          setShowSendMessageModal(false);
          setSelectedClassForMessage(null);
        }}
        classData={selectedClassForMessage}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}