"use client";
import React from 'react';
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { GlobalLoader } from "@/components/GlobalLoader";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Video, Link, UploadCloud, Download, Eye, X, Search, Heart, Trash2, Sparkles, Lock, CheckCircle2, Info,
  GraduationCap, BookOpen, Tag, Building, Layers, Calendar, CloudCheck
} from "lucide-react";
import { saveFile, getFile } from "@/lib/offlineStorage";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { UnitPics } from "@/components/deco/UnitPics";

// SKELETON LOADER COMPONENT
const SkeletonCard = () => (
  <div className="animate-pulse bg-white dark:bg-gray-800 border-0 border-b border-gray-100 dark:border-gray-800 sm:border sm:rounded-xl p-3 md:p-4">
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="flex flex-wrap gap-1">
        <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-14 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-2">
          <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  </div>
);

const SECTIONS = [
  {
    title: "Practical Assessments",
    subcategories: [
      "Nursing Care Assessment",
      "Immunization Assessment",
      "Mother in Labour Assessment",
      "Ward Management Assessment",
      "Baby at Risk Assessment",
      "Rural Assessment",
    ],
  },
  {
    title: "Case Studies",
    subcategories: [
      "Medical Case Study",
      "Surgical Case Study",
      "Paediatric Case Study",
      "Obstetric Case Study",
      "Community Health Case Study",
    ],
  },
  {
    title: "Research Project",
    subcategories: ["Research Project"],
  },
  {
    title: "Community Diagnosis",
    subcategories: ["Rural Community Diagnosis"],
  },
  {
    title: "School Health Visit",
    subcategories: ["School Health Visit"],
  },
  {
    title: "District Report Booklet",
    subcategories: ["District Report Booklet"],
  },
];

// Cache helpers
const notesCache = new Map();
const statsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Role-based subscription pricing - FOR DISPLAY ONLY in the upgrade overlay
const TUTOR_SUBSCRIPTION = {
  price: 299,
  duration: "2 months",
  currency: "KES",
  features: [
    "Full access to all assessment notes",
    "Download for offline study",
    "Case studies & practical guides",
    "Institutional exam creation & management",
    "Free job posting across our site",
    "Student analytics dashboard",
    "Priority support"
  ]
};

const STUDENT_SUBSCRIPTION = {
  price: 199,
  duration: "2 months",
  currency: "KES",
  features: [
    "Full access to all assessment notes",
    "Download for offline study",
    "Case studies & practical guides",
    "Research project templates",
    "Community diagnosis guides",
    "School health visit resources",
    "District report booklets"
  ]
};

export default function AssessmentNotes() {
  // ORIGINAL subscription hook - this is the ONLY source of truth for access
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();

  // User role state - ONLY used for displaying different pricing in the overlay
  const [userRole, setUserRole] = useState<"student" | "tutor" | "staff" | null>(null);
  const [isTutor, setIsTutor] = useState(false);

  const [showPremiumOverlay, setShowPremiumOverlay] = useState(false);
  const [selectedNoteForOverlay, setSelectedNoteForOverlay] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fullscreenNote, setFullscreenNote] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [offlineFiles, setOfflineFiles] = useState<string[]>([]);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // State for the details overlay (shows all details about a note)
  const [detailsOverlayNote, setDetailsOverlayNote] = useState<any>(null);

  // Refs for deduplication
  const isMounted = useRef(true);
  const isFetchingNotes = useRef(false);
  const isFetchingStats = useRef(false);
  const lastStatsFetch = useRef(0);
  const pendingLikeUpdates = useRef<Map<string, boolean>>(new Map());

  // Get subscription info for display based on role (ONLY FOR DISPLAY)
  const getSubscriptionInfoForDisplay = () => {
    if (isTutor) {
      return TUTOR_SUBSCRIPTION;
    }
    return STUDENT_SUBSCRIPTION;
  };

  const subscriptionInfoForDisplay = getSubscriptionInfoForDisplay();

  // Dark mode detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Get session and user role (ONLY for display purposes in the upgrade overlay)
  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (isMounted.current) {
        setSession(sessionData.session);

        if (sessionData.session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", sessionData.session.user.id)
            .single();

          if (profileData) {
            const role = profileData.role as "student" | "tutor" | "staff";
            setUserRole(role);
            setIsTutor(role === "tutor");
          }
        }
      }
    };
    getSessionAndRole();
  }, []);

  // OPTIMIZED: Fetch notes with caching - NOW PULLS ALL COLUMNS
  const fetchNotes = useCallback(async () => {
    if (!isMounted.current || isFetchingNotes.current) return;

    const cacheKey = `assessment_notes_public`;
    const now = Date.now();

    if (notesCache.has(cacheKey)) {
      const cached = notesCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
        setNotes(cached.data);
        setLoadingNotes(false);
        return;
      }
    }

    const cachedNotes = localStorage.getItem("cachedAssessmentNotes");
    if (cachedNotes) {
      try {
        const parsed = JSON.parse(cachedNotes);
        if (parsed.timestamp && now - parsed.timestamp < CACHE_DURATION) {
          setNotes(parsed.data);
          setLoadingNotes(false);
          notesCache.set(cacheKey, { data: parsed.data, timestamp: parsed.timestamp });
          return;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          setLoadingNotes(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem("cachedAssessmentNotes");
      }
    }

    isFetchingNotes.current = true;
    setLoadingNotes(true);

    try {
      // 🚀 NOW PULLING ALL COLUMNS FOR FULL DISPLAY
      const { data, error } = await supabase
        .from("notes")
        .select(`
          id,
          title,
          description,
          unit,
          block,
          course,
          institution,
          file_url,
          file_type,
          uploaded_by,
          created_at,
          tags,
          is_featured,
          is_public,
          download_count,
          view_count,
          approved,
          category,
          sub_category,
          visibility,
          usage_type
        `)
        .eq("is_public", true)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        const fallbackCache = localStorage.getItem("cachedAssessmentNotes");
        if (fallbackCache) {
          const parsed = JSON.parse(fallbackCache);
          setNotes(Array.isArray(parsed) ? parsed : (parsed.data || []));
          setLoadingNotes(false);
          isFetchingNotes.current = false;
          return;
        }
        throw error;
      }

      if (isMounted.current) {
        setNotes(data || []);
        const cacheData = { data: data || [], timestamp: now };
        notesCache.set(cacheKey, cacheData);
        localStorage.setItem("cachedAssessmentNotes", JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error("Error in fetchNotes:", error);
      if (isMounted.current) setNotes([]);
    } finally {
      if (isMounted.current) setLoadingNotes(false);
      isFetchingNotes.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchNotes();
    return () => { isMounted.current = false; };
  }, [fetchNotes]);

  // OPTIMIZED: Fetch stats with caching
  const fetchStats = useCallback(async () => {
    if (!notes.length || !session?.user || isFetchingStats.current) return;

    const now = Date.now();
    if (now - lastStatsFetch.current < 30000) return;
    lastStatsFetch.current = now;

    const statsKey = `assessment_stats_${session.user.id}`;

    if (statsCache.has(statsKey)) {
      const cached = statsCache.get(statsKey);
      if (now - cached.timestamp < 30000 && isMounted.current) {
        setLikeCounts(cached.likes);
        setViewCounts(cached.views);
        setBookmarkedItems(cached.bookmarked);
        return;
      }
    }

    isFetchingStats.current = true;

    try {
      const noteIds = notes.map(n => n.id);

      const [likesRes, viewsRes, userLikesRes] = await Promise.all([
        supabase.from("note_likes").select("note_id").in("note_id", noteIds),
        supabase.from("note_views").select("note_id").in("note_id", noteIds),
        session.user ? supabase.from("note_likes").select("note_id").eq("user_id", session.user.id).in("note_id", noteIds) : { data: [] },
      ]);

      const likesMap: Record<string, number> = {};
      const viewsMap: Record<string, number> = {};
      const userLiked: string[] = [];

      likesRes.data?.forEach((l: any) => {
        likesMap[l.note_id] = (likesMap[l.note_id] || 0) + 1;
      });

      viewsRes.data?.forEach((v: any) => {
        viewsMap[v.note_id] = (viewsMap[v.note_id] || 0) + 1;
      });

      userLikesRes?.data?.forEach((ul: any) => {
        userLiked.push(ul.note_id);
      });

      if (isMounted.current) {
        setLikeCounts(likesMap);
        setViewCounts(viewsMap);
        setBookmarkedItems(userLiked);
        statsCache.set(statsKey, { likes: likesMap, views: viewsMap, bookmarked: userLiked, timestamp: now });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      isFetchingStats.current = false;
    }
  }, [notes, session?.user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Focus-based refresh
  useEffect(() => {
    let focusTimer: NodeJS.Timeout;
    let lastFocusRefresh = 0;

    const handleFocus = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const now = Date.now();
        if (now - lastFocusRefresh < 30000) return;
        lastFocusRefresh = now;
        if (isMounted.current) {
          fetchNotes();
          fetchStats();
        }
      }, 500);
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [fetchNotes, fetchStats]);

  const loadOfflineFile = async (fileId: string, fileUrl: string) => {
    const file = await getFile(fileId);
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
      return;
    }
    window.open(fileUrl, "_blank");
  };

  // ORIGINAL handleViewNote - ONLY uses isPremium for access check
  const handleViewNote = async (note: any) => {
    // ONLY isPremium determines access - NO tutor bypass
    if (!isPremium) {
      setSelectedNoteForOverlay(note);
      setShowPremiumOverlay(true);
      return;
    }

    setFullscreenNote(note);
    if (session?.user?.id) {
      const { error } = await supabase
        .from("note_views")
        .upsert(
          { note_id: note.id, user_id: session.user.id },
          { onConflict: ["note_id", "user_id"] }
        );

      if (!error && isMounted.current) {
        setViewCounts((prev) => ({
          ...prev,
          [note.id]: (prev[note.id] || 0) + 1,
        }));
        statsCache.delete(`assessment_stats_${session.user.id}`);
      }
    }
  };

  // ORIGINAL handleDownloadNote - ONLY uses isPremium for access check
  const handleDownloadNote = async (noteId: string, url: string) => {
    // ONLY isPremium determines access - NO tutor bypass
    if (!isPremium) {
      const note = notes.find(n => n.id === noteId);
      setSelectedNoteForOverlay(note);
      setShowPremiumOverlay(true);
      return;
    }

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await saveFile(noteId, blob);
      if (isMounted.current) setOfflineFiles((prev) => [...prev, noteId]);
      alert("Saved offline!");
    } catch (err) {
      console.error("Failed to save offline:", err);
    }
  };

  const handleDelete = async (note: any) => {
    if (!session?.user?.id) return alert("Login required");
    if (note.uploaded_by !== session.user.id) return alert("You can only delete your own uploads");
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error: dbErr } = await supabase.from("notes").delete().eq("id", note.id);
      if (dbErr) throw dbErr;
      if (isMounted.current) {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        notesCache.delete(`assessment_notes_public`);
      }
      alert("Record removed successfully!");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete record.");
    }
  };

  // Optimized toggle like
  const toggleLike = async (noteId: string) => {
    if (!session?.user?.id) return alert("Login required");

    if (pendingLikeUpdates.current.has(noteId)) return;
    pendingLikeUpdates.current.set(noteId, true);
    setTimeout(() => pendingLikeUpdates.current.delete(noteId), 1000);

    const alreadyLiked = bookmarkedItems.includes(noteId);

    setBookmarkedItems((prev) =>
      alreadyLiked ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
    setLikeCounts((prev) => ({
      ...prev,
      [noteId]: Math.max((prev[noteId] || 0) + (alreadyLiked ? -1 : 1), 0)
    }));

    try {
      if (alreadyLiked) {
        await supabase.from("note_likes").delete().match({ note_id: noteId, user_id: session.user.id });
      } else {
        await supabase.from("note_likes").insert({ note_id: noteId, user_id: session.user.id });
      }
      statsCache.delete(`assessment_stats_${session.user.id}`);
    } catch (error) {
      setBookmarkedItems((prev) =>
        alreadyLiked ? [...prev, noteId] : prev.filter((id) => id !== noteId)
      );
      setLikeCounts((prev) => ({
        ...prev,
        [noteId]: Math.max((prev[noteId] || 0) + (alreadyLiked ? 1 : -1), 0)
      }));
      console.error("Error toggling like:", error);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;

    if (!file || !formData.get("title")) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const cloudName = "dpj5vprwf";
      const uploadPreset = "medrae_preset";

      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append("file", file);
      cloudinaryFormData.append("upload_preset", uploadPreset);
      cloudinaryFormData.append("folder", "assessment_notes");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        { method: "POST", body: cloudinaryFormData }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || "Cloudinary Upload Failed");
      }

      const data = await response.json();
      const file_url = data.secure_url;
      const ext = file.name.split(".").pop();

      const payload = {
        uploaded_by: session.user.id,
        title: formData.get("title"),
        description: formData.get("description"),
        course: formData.get("course"),
        institution: formData.get("institution"),
        unit: formData.get("unit"),
        category: formData.get("category"),
        sub_category: selectedSubcategory,
        block: selectedBlock,
        file_type: ext,
        file_url: file_url,
        is_public: true,
        approved: true,
      };

      const { data: dbData, error: insertErr } = await supabase
        .from("notes")
        .insert(payload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      alert("Upload successful!");
      if (isMounted.current) {
        setNotes((prev) => [dbData, ...prev]);
        notesCache.delete(`assessment_notes_public`);
        setShowUploadForm(false);
        setSelectedFile(null);
        setUploadProgress(null);
      }
    } catch (err: any) {
      console.error("Upload process error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "link": return <Link className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "video": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "link": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.course || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.unit || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.institution || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (subscriptionLoading) {
    return <GlobalLoader message="Verifying subscription..." />;
  }

  return (
    <>
      {/* EDGE-TO-EDGE ON MOBILE - NO PADDING */}
      <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] px-0 md:px-4 lg:px-6">
        <div className="w-full max-w-full mx-auto space-y-0 md:space-y-6 py-0 md:py-6">
          {/* Header Card - NO BORDER ON MOBILE */}
          <div className="shadow-md hover:shadow-lg transition-all rounded-none md:rounded-2xl border-0 overflow-hidden bg-white dark:bg-muted/30">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-emerald-500" />
            <div className="p-3 md:p-6 pb-2 md:pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xl md:text-3xl font-bold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text text-base md:text-3xl">
                    Assessment Notes
                  </span>
                </div>
                {isTutor && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <GraduationCap className="h-3 w-3 mr-1" /> Tutor
                  </Badge>
                )}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Access practical guides, case studies, and research resources
              </div>
            </div>

            <div className="p-3 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
              <div>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
                  This page is dedicated to assessment guides, case study guides, and research resources.
                  It brings together universal materials designed to support nursing education across all colleges and training institutions
                  <span
                    className="text-primary font-semibold cursor-pointer ml-1 hover:underline"
                    onClick={() => setShowDescription(!showDescription)}
                  >
                    {showDescription ? " Show less" : " Learn more"}
                  </span>
                </p>

                <AnimatePresence initial={false}>
                  {showDescription && (
                    <motion.div
                      className="mt-2 md:mt-3 text-muted-foreground text-xs md:text-sm leading-relaxed space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <p>
                        Here, you'll find practical guides, structured case studies, and project references curated to
                        help students prepare effectively, build confidence, and excel both in classroom learning and clinical practice.
                        And note, this does not give you the right to copy-paste it; it only provides a picture to show you what to expect.
                      </p>
                      <p className="text-[10px] md:text-xs italic">
                        Universal nursing assessment resources for all colleges
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, course, unit, or institution..."
                  className="pl-9 md:pl-10 h-9 md:h-11 rounded-none md:rounded-xl text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Upload Form Toggle */}
          <div className="flex justify-end px-3 md:px-0">
            <Button
              variant={showUploadForm ? "destructive" : "default"}
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="rounded-none md:rounded-xl font-semibold text-sm h-9 md:h-10 px-3 md:px-4"
            >
              <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
              {showUploadForm ? "Cancel Upload" : "New Upload"}
            </Button>
          </div>

          {/* Upload Form - NO BORDER ON MOBILE */}
          <AnimatePresence>
            {showUploadForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border-0 md:border rounded-none md:rounded-xl p-3 md:p-4 space-y-3 md:space-y-4 bg-muted/20 mx-0"
              >
                <form onSubmit={handleUpload} className="space-y-3 md:space-y-4">
                  <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2">
                    <Input name="title" placeholder="Title *" required className="rounded-none md:rounded-xl text-sm h-9 md:h-10" />
                    <Input name="description" placeholder="Short Description" className="rounded-none md:rounded-xl text-sm h-9 md:h-10" />
                    <Input name="course" placeholder="Course *" required className="rounded-none md:rounded-xl text-sm h-9 md:h-10" />
                    <Input name="institution" placeholder="Institution *" required className="rounded-none md:rounded-xl text-sm h-9 md:h-10" />
                    <Input name="unit" placeholder="Unit *" required className="rounded-none md:rounded-xl text-sm h-9 md:h-10" />
                    <Input name="category" placeholder="Category *" required className="rounded-none md:rounded-xl text-sm h-9 md:h-10" />
                    <select
                      className="border-0 md:border rounded-none md:rounded-xl px-3 py-2 text-sm bg-white text-black dark:bg-gray-800 dark:text-white h-9 md:h-10"
                      value={selectedBlock}
                      onChange={(e) => {
                        setSelectedBlock(e.target.value);
                        setSelectedSubcategory("");
                      }}
                      required
                    >
                      <option value="">Select Block *</option>
                      {SECTIONS.map((s) => (
                        <option key={s.title} value={s.title}>{s.title}</option>
                      ))}
                    </select>
                    <select
                      className="border-0 md:border rounded-none md:rounded-xl px-3 py-2 text-sm bg-white text-black dark:bg-gray-800 dark:text-white h-9 md:h-10"
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      required
                      disabled={!selectedBlock}
                    >
                      <option value="">Select Subcategory *</option>
                      {SECTIONS.find((s) => s.title === selectedBlock)?.subcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <Input
                      type="file"
                      name="file"
                      required
                      className="rounded-none md:rounded-xl text-sm h-9 md:h-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                    />
                  </div>

                  {uploadProgress !== null && selectedFile && (
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{uploadProgress}%</span>
                        <span>
                          {((selectedFile.size * (uploadProgress / 100)) / (1024 * 1024)).toFixed(2)} MB /{" "}
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={uploading} className="w-full rounded-none md:rounded-xl text-sm h-9 md:h-10">
                    <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                    {uploading ? "Uploading..." : "Upload Note"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Accordion Sections - NO BORDER ON MOBILE */}
          <div className="space-y-3 md:space-y-4 px-0">
            {SECTIONS.map((section, i) => {
              const sectionNotes = filteredNotes.filter((n) => n.block === section.title);
              const hasNotes = sectionNotes.length > 0;

              return (
                <div key={i} className="border-0 md:border rounded-none md:rounded-xl px-0 md:px-3 bg-card">
                  <div className="py-3 md:py-4">
                    <div className="flex items-center gap-2 px-3 md:px-0">
                      <span className="text-sm md:text-base font-semibold">{section.title}</span>
                      {hasNotes && (
                        <Badge variant="secondary" className="text-[10px] md:text-xs">
                          {sectionNotes.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="pb-3 md:pb-4">
                    <Tabs defaultValue={section.subcategories[0]} className="w-full">
                      <TabsList className="flex flex-wrap gap-1.5 md:gap-2 w-full h-auto bg-transparent px-3 md:px-0">
                        {section.subcategories.map((sub) => {
                          const subNotesCount = filteredNotes.filter(
                            (n) => n.sub_category === sub && n.block === section.title
                          ).length;
                          return (
                            <TabsTrigger
                              key={sub}
                              value={sub}
                              className="text-[10px] md:text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none md:rounded-lg px-2 md:px-3 py-1 h-7 md:h-8"
                            >
                              {sub}
                              {subNotesCount > 0 && (
                                <span className="ml-0.5 md:ml-1 text-[8px] md:text-xs opacity-70">({subNotesCount})</span>
                              )}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>

                      {section.subcategories.map((sub) => {
                        const subNotes = filteredNotes.filter(
                          (n) => n.sub_category === sub && n.block === section.title
                        );

                        return (
                          <TabsContent key={sub} value={sub} className="mt-3 md:mt-4">
                            {loadingNotes ? (
                              // SKELETON LOADERS
                              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} />)}
                              </div>
                            ) : subNotes.length === 0 ? (
                              <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                                No notes yet in {sub}. Check back soon!
                              </p>
                            ) : (
                              <div className="grid gap-2 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {subNotes.map((note, index) => (
                                  <React.Fragment key={note.id}>
                                    {/* CARD - NO BORDER ON MOBILE */}
                                    <div
                                      className="flex flex-col overflow-hidden hover:shadow-md transition-all cursor-pointer border-0 border-b border-gray-100 dark:border-gray-800 sm:border sm:rounded-xl bg-white dark:bg-gray-800 p-3 md:p-4"
                                      onClick={() => setDetailsOverlayNote(note)}
                                    >
                                      <div className="pb-1 md:pb-2">
                                        <div className="flex items-start justify-between gap-1 md:gap-2">
                                          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                            <div className="p-1 md:p-1.5 bg-gray-50 dark:bg-gray-900 rounded">
                                              {getTypeIcon(note.file_type)}
                                            </div>
                                            <div className="text-sm md:text-base font-semibold line-clamp-1">
                                              {note.title}
                                            </div>
                                          </div>
                                          <Badge className={`${getTypeColor(note.file_type)} text-[8px] md:text-[10px] px-1.5 md:px-2`}>
                                            {note.file_type?.toUpperCase() || "PDF"}
                                          </Badge>
                                        </div>

                                        {note.description && (
                                          <div className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 md:line-clamp-3 mt-0.5 md:mt-1 leading-relaxed">
                                            {note.description}
                                          </div>
                                        )}

                                        <div className="flex flex-wrap gap-0.5 md:gap-1 mt-1 md:mt-2">
                                          {note.course && (
                                            <Badge variant="outline" className="text-[7px] md:text-[9px] font-medium bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 px-1 md:px-1.5">
                                              <BookOpen className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />
                                              {note.course}
                                            </Badge>
                                          )}
                                          {note.unit && (
                                            <Badge variant="outline" className="text-[7px] md:text-[9px] font-medium bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 px-1 md:px-1.5">
                                              <Tag className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />
                                              {note.unit}
                                            </Badge>
                                          )}
                                          {note.institution && (
                                            <Badge variant="outline" className="text-[7px] md:text-[9px] font-medium bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 px-1 md:px-1.5">
                                              <Building className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />
                                              {note.institution}
                                            </Badge>
                                          )}
                                          {note.category && (
                                            <Badge variant="outline" className="text-[7px] md:text-[9px] font-medium bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 px-1 md:px-1.5">
                                              {note.category}
                                            </Badge>
                                          )}
                                          {note.is_featured && (
                                            <Badge className="text-[7px] md:text-[9px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 px-1 md:px-1.5">
                                              <Sparkles className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5" />
                                              Featured
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between mt-1 md:mt-2">
                                          <span className="text-[8px] md:text-xs text-muted-foreground flex items-center gap-0.5 md:gap-1">
                                            <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                            {new Date(note.created_at).toLocaleDateString()}
                                          </span>
                                          <div className="flex items-center gap-0.5 md:gap-1">
                                            {offlineFiles.includes(note.id) && (
                                              <Badge variant="outline" className="text-[7px] md:text-[9px] flex items-center gap-0.5">
                                                <CloudCheck className="h-2 w-2 md:h-2.5 md:w-2.5" /> Offline
                                              </Badge>
                                            )}
                                            {!isPremium && (
                                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-[7px] md:text-[9px] flex items-center gap-0.5 px-1 md:px-1.5">
                                                <Lock className="h-2 w-2 md:h-2.5 md:w-2.5" /> Premium
                                              </Badge>
                                            )}
                                            {note.download_count > 0 && (
                                              <span className="text-[7px] md:text-[9px] text-gray-400 flex items-center gap-0.5">
                                                <Download className="h-2 w-2 md:h-2.5 md:w-2.5" /> {note.download_count}
                                              </span>
                                            )}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 md:h-6 md:w-6 p-0 rounded-full"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailsOverlayNote(note);
                                              }}
                                            >
                                              <Info className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="pt-1 md:pt-0 space-y-2 md:space-y-3">
                                        {note.tags && note.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-0.5 md:gap-1">
                                            {note.tags.slice(0, 3).map((tag: string, i: number) => (
                                              <span key={i} className="text-[6px] md:text-[8px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1 md:px-1.5 py-0.5 rounded">
                                                #{tag}
                                              </span>
                                            ))}
                                            {note.tags.length > 3 && (
                                              <span className="text-[6px] md:text-[8px] font-medium text-gray-400">+{note.tags.length - 3}</span>
                                            )}
                                          </div>
                                        )}

                                        <div className="flex gap-1 md:gap-2 flex-wrap">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 md:h-8 px-1.5 md:px-2 rounded text-[9px] md:text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadNote(note.id, note.file_url);
                                            }}
                                          >
                                            <Download className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1" />
                                            Cache
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 md:h-8 px-1.5 md:px-2 rounded text-[9px] md:text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewNote(note);
                                            }}
                                          >
                                            <Eye className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1" />
                                            View
                                          </Button>
                                          {session?.user?.id === note.uploaded_by && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 md:h-8 px-1.5 md:px-2 rounded text-red-500 hover:text-red-600 text-[9px] md:text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(note);
                                              }}
                                            >
                                              <Trash2 className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                                            </Button>
                                          )}
                                        </div>

                                        <div className="flex justify-between items-center pt-1 md:pt-2 border-t border-gray-100 dark:border-gray-800">
                                          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-muted-foreground">
                                            <Eye className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                                            <span>{viewCounts[note.id] || 0}</span>
                                            {note.download_count > 0 && (
                                              <>
                                                <Download className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 ml-0.5 md:ml-1" />
                                                <span>{note.download_count}</span>
                                              </>
                                            )}
                                          </div>
                                          <button
                                            className={`flex items-center gap-1 text-[9px] md:text-xs transition-colors ${bookmarkedItems.includes(note.id) ? "text-red-500" : "text-muted-foreground"
                                              }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleLike(note.id);
                                            }}
                                          >
                                            <Heart className={`h-2.5 w-2.5 md:h-3.5 md:w-3.5 ${bookmarkedItems.includes(note.id) ? "fill-current" : ""}`} />
                                            <span>{likeCounts[note.id] || 0}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* UnitPics image after every 4 cards */}
                                    <UnitPics position={index + 1} />
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fullscreen Viewer - same as before */}
      <AnimatePresence>
        {fullscreenNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            <div className="flex justify-end p-2">
              <Button onClick={() => setFullscreenNote(null)} variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {fullscreenNote.file_type === "pdf" ? (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={fullscreenNote.file_url}
                  plugins={[defaultLayoutPluginInstance]}
                  theme={isDarkMode ? "dark" : "light"}
                  renderLoader={() => (
                    <div className="flex items-center justify-center w-full h-full">
                      <GlobalLoader message="Loading PDF..." />
                    </div>
                  )}
                />
              </Worker>
            ) : (
              <iframe
                src={fullscreenNote.file_url}
                className="flex-1 w-full"
                style={{ border: "none" }}
                title={fullscreenNote.title}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Upgrade Overlay - same as before */}
      <AnimatePresence>
        {showPremiumOverlay && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPremiumOverlay(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className={`relative p-8 text-center ${isTutor ? 'bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500' : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'}`}>
                <button onClick={() => setShowPremiumOverlay(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isTutor ? <GraduationCap className="w-10 h-10 text-white" /> : <Lock className="w-10 h-10 text-white" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{isTutor ? "Tutor Pro Access Required" : "Premium Resource"}</h3>
                <p className="text-white/80 text-sm">{selectedNoteForOverlay?.title}</p>
              </div>
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  {subscriptionInfoForDisplay.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">{subscriptionInfoForDisplay.currency} {subscriptionInfoForDisplay.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400"> / {subscriptionInfoForDisplay.duration}</span>
                </div>

                <button
                  onClick={() => {
                    setShowPremiumOverlay(false);
                    navigate("/subscription", { state: { role: isTutor ? "tutor" : "student" } });
                  }}
                  className={`w-full font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-3 ${isTutor
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isTutor ? `Upgrade to Tutor Pro — ${subscriptionInfoForDisplay.currency} ${subscriptionInfoForDisplay.price}` : `Unlock All — ${subscriptionInfoForDisplay.currency} ${subscriptionInfoForDisplay.price} for ${subscriptionInfoForDisplay.duration}`}</span>
                </button>
                <button
                  onClick={() => setShowPremiumOverlay(false)}
                  className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 text-sm font-medium"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILS OVERLAY - FULL EDGE-TO-EDGE ON MOBILE */}
      <AnimatePresence>
        {detailsOverlayNote && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailsOverlayNote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full h-full md:max-w-lg md:max-h-[85vh] md:rounded-xl overflow-y-auto custom-scrollbar bg-white dark:bg-gray-900 shadow-2xl border-0 md:border border-gray-200 dark:border-gray-800"
            >
              {/* Header with gradient bar - sticky on mobile */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-emerald-500" />
                <div className="flex justify-between items-center p-3 md:p-4">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    {getTypeIcon(detailsOverlayNote.file_type)}
                    <h3 className="font-bold text-sm md:text-lg text-gray-900 dark:text-gray-100 line-clamp-1">
                      {detailsOverlayNote.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setDetailsOverlayNote(null)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-5 w-5 md:h-6 md:w-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content - more padding on mobile for readability */}
              <div className="p-4 md:p-5 space-y-4 md:space-y-5">
                {/* Description section */}
                {detailsOverlayNote.description && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Info className="h-2.5 w-2.5 md:h-3 md:w-3" /> Description
                    </h4>
                    <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {detailsOverlayNote.description}
                    </p>
                  </div>
                )}

                {/* Details grid - ALL COLUMNS */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                  {detailsOverlayNote.course && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Course</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words text-xs md:text-sm">{detailsOverlayNote.course}</p>
                    </div>
                  )}
                  {detailsOverlayNote.institution && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Institution</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words text-xs md:text-sm">{detailsOverlayNote.institution}</p>
                    </div>
                  )}
                  {detailsOverlayNote.unit && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Unit</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words text-xs md:text-sm">{detailsOverlayNote.unit}</p>
                    </div>
                  )}
                  {detailsOverlayNote.category && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Category</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words text-xs md:text-sm">{detailsOverlayNote.category}</p>
                    </div>
                  )}
                  {detailsOverlayNote.block && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Block</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words text-xs md:text-sm">{detailsOverlayNote.block}</p>
                    </div>
                  )}
                  {detailsOverlayNote.sub_category && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Subcategory</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words text-xs md:text-sm">{detailsOverlayNote.sub_category}</p>
                    </div>
                  )}
                  {detailsOverlayNote.usage_type && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Usage Type</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-xs md:text-sm">{detailsOverlayNote.usage_type}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">File Type</p>
                    <Badge className={getTypeColor(detailsOverlayNote.file_type)}>
                      {detailsOverlayNote.file_type?.toUpperCase() || "PDF"}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Uploaded</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-xs md:text-sm">
                      {new Date(detailsOverlayNote.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {detailsOverlayNote.download_count > 0 && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Downloads</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-xs md:text-sm">{detailsOverlayNote.download_count}</p>
                    </div>
                  )}
                  {detailsOverlayNote.tags && detailsOverlayNote.tags.length > 0 && (
                    <div className="space-y-0.5 col-span-full">
                      <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {detailsOverlayNote.tags.map((tag: string, i: number) => (
                          <span key={i} className="text-[9px] md:text-xs bg-gray-100 dark:bg-gray-800 px-1.5 md:px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-0.5 md:gap-1">
                      <Eye className="h-3 w-3 md:h-4 md:w-4" /> {viewCounts[detailsOverlayNote.id] || 0} views
                    </span>
                    <button
                      className={`flex items-center gap-0.5 md:gap-1 transition-colors ${bookmarkedItems.includes(detailsOverlayNote.id) ? "text-red-500" : "text-gray-600 dark:text-gray-400"
                        }`}
                      onClick={() => toggleLike(detailsOverlayNote.id)}
                    >
                      <Heart className={`h-3 w-3 md:h-4 md:w-4 ${bookmarkedItems.includes(detailsOverlayNote.id) ? "fill-current" : ""}`} />
                      {likeCounts[detailsOverlayNote.id] || 0} likes
                    </button>
                    {detailsOverlayNote.download_count > 0 && (
                      <span className="flex items-center gap-0.5 md:gap-1">
                        <Download className="h-3 w-3 md:h-4 md:w-4" /> {detailsOverlayNote.download_count} downloads
                      </span>
                    )}
                  </div>
                  {offlineFiles.includes(detailsOverlayNote.id) && (
                    <Badge variant="outline" className="text-[8px] md:text-[10px]">Saved Offline</Badge>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-1 md:pt-2">
                  <Button
                    className="w-full sm:flex-1 rounded-none md:rounded-xl text-xs md:text-sm h-9 md:h-10"
                    onClick={() => {
                      setDetailsOverlayNote(null);
                      handleViewNote(detailsOverlayNote);
                    }}
                  >
                    <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    View Full Document
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1 rounded-none md:rounded-xl text-xs md:text-sm h-9 md:h-10"
                    onClick={() => {
                      setDetailsOverlayNote(null);
                      handleDownloadNote(detailsOverlayNote.id, detailsOverlayNote.file_url);
                    }}
                  >
                    <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    Save Offline
                  </Button>
                </div>

                {!isPremium && (
                  <div className="mt-1 md:mt-2 p-2 md:p-3 bg-amber-50 dark:bg-amber-950/30 rounded-none md:rounded-xl border-0 md:border border-amber-200 dark:border-amber-800">
                    <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      This is a premium resource. Upgrade to view the full document.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}