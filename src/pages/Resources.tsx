"use client";
import React from 'react';
import { GlobalLoader } from "@/components/GlobalLoader";
import { TermsButton } from "@/components/ui/TermsButton";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import "../styles/pdfOverrides.css";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Layers, Sparkles, Lock,
  XCircle,
  Video,
  CheckCircle2,
  FilePlus,
  Library,
  Info,
  Trash2,
  Link,
  Heart,
  Search,
  Download,
  Eye,
  X,
  UploadCloud,
  DownloadCloud,
  Calendar,
  CloudCheck,
  ChevronDown,
  GraduationCap,
  Briefcase,
  Megaphone,
  Building,
  BookOpen,
  Tag,
} from "lucide-react";
import { saveFile, getFile } from "@/lib/offlineStorage";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { UnitPics } from "@/components/deco/UnitPics";

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
    "Full access to all student resources",
    "Institutional exam creation & management",
    "Free job posting across our site",
    "Student analytics dashboard",
    "Priority support",
    "Upload unlimited resources",
    "Auto-approved uploads"
  ]
};

const STUDENT_SUBSCRIPTION = {
  price: 199,
  duration: "2 months",
  currency: "KES",
  features: [
    "Full access to all study notes",
    "Download for offline study",
    "Video tutorials & lectures",
    "Past papers & marking schemes",
    "Case studies & practical guides"
  ]
};

// SKELETON LOADER COMPONENT
const SkeletonCard = () => (
  <div className="animate-pulse bg-white dark:bg-gray-800 border-0 border-b border-gray-100 dark:border-gray-800 sm:border sm:rounded-xl p-3 md:p-5">
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="flex flex-wrap gap-1">
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-2">
          <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  </div>
);

export function Resources() {
  // ORIGINAL subscription hook - this is the ONLY source of truth for access
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();

  // User role state - ONLY used for displaying different pricing in the overlay
  const [userRole, setUserRole] = useState<"student" | "tutor" | "staff" | null>(null);
  const [isTutor, setIsTutor] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [showPremiumOverlay, setShowPremiumOverlay] = useState(false);
  const [selectedNoteForOverlay, setSelectedNoteForOverlay] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    block: "PTS",
    course: localStorage.getItem("selectedCourse") || "",
    fileType: "pdf",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadAbortController = useRef<AbortController | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [floatingBlockOpen, setFloatingBlockOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState("PTS");
  const [offlineFiles, setOfflineFiles] = useState<string[]>([]);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fullscreenNote, setFullscreenNote] = useState<any>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // NEW: State for the details overlay (shows all details about a note)
  const [detailsOverlayNote, setDetailsOverlayNote] = useState<any>(null);

  // Refs for cleanup and deduplication
  const isMounted = useRef(true);
  const isFetchingNotes = useRef(false);
  const isFetchingStats = useRef(false);
  const channelRef = useRef<any>(null);
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

  useEffect(() => {
    isMounted.current = true;
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      isMounted.current = false;
      observer.disconnect();
    };
  }, []);

  // Get session and user role (ONLY for display purposes in the upgrade overlay)
  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: { session: sessionData } } = await supabase.auth.getSession();
      if (isMounted.current) {
        setSession(sessionData);

        if (sessionData?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", sessionData.user.id)
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

  // ✅ OPTIMIZED: Fetch notes with caching and deduplication - NOW PULLS ALL COLUMNS
  const fetchNotes = useCallback(async () => {
    if (!isMounted.current || isFetchingNotes.current) return;

    const cacheKey = `notes_public`;
    const now = Date.now();

    if (notesCache.has(cacheKey)) {
      const cached = notesCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION && isMounted.current) {
        setNotes(cached.data);
        setLoadingNotes(false);
        return;
      }
    }

    const cachedNotes = localStorage.getItem("cachedNotes");
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
        console.warn("Failed to parse cached notes");
        localStorage.removeItem("cachedNotes");
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
        const fallbackCache = localStorage.getItem("cachedNotes");
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
        localStorage.setItem("cachedNotes", JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error("Error in fetchNotes:", error);
      if (isMounted.current) {
        setNotes([]);
      }
    } finally {
      if (isMounted.current) setLoadingNotes(false);
      isFetchingNotes.current = false;
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Refresh on window focus
  useEffect(() => {
    let focusTimer: NodeJS.Timeout;
    let lastFocusRefresh = 0;

    const handleFocus = () => {
      const now = Date.now();
      const cached = localStorage.getItem("cachedNotes");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (now - parsed.timestamp < 600000) return;
      }
      fetchNotes();
      fetchStats();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [fetchNotes]);

  const fetchStats = useCallback(async () => {
    if (!notes.length || !session?.user || isFetchingStats.current) return;

    const now = Date.now();
    if (now - lastStatsFetch.current < 30000) return;
    lastStatsFetch.current = now;

    const statsKey = `stats_${session.user.id}`;

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
        supabase.from("note_likes").select("note_id"),
        supabase.from("note_views").select("note_id"),
        supabase.from("note_likes").select("note_id").eq("user_id", session.user.id),
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenNote(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const filteredResources = notes.filter(
    (note) =>
      (note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.course || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.unit || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.institution || "").toLowerCase().includes(searchTerm.toLowerCase()))
      &&
      (uploadForm.course ? (note.course || "").toUpperCase() === uploadForm.course.toUpperCase() : true)
  );

  const toggleLike = useCallback(async (noteId: string) => {
    if (!session?.user?.id) return alert("Please login to like resources");

    if (pendingLikeUpdates.current.has(noteId)) return;
    pendingLikeUpdates.current.set(noteId, true);
    setTimeout(() => pendingLikeUpdates.current.delete(noteId), 1000);

    const hasLiked = bookmarkedItems.includes(noteId);

    setBookmarkedItems(prev =>
      hasLiked ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
    setLikeCounts(prev => ({
      ...prev,
      [noteId]: Math.max((prev[noteId] || 0) + (hasLiked ? -1 : 1), 0),
    }));

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from("note_likes")
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("note_likes")
          .insert([{ note_id: noteId, user_id: session.user.id }]);
        if (error) throw error;
      }
      const statsKey = `stats_${session.user.id}`;
      statsCache.delete(statsKey);
    } catch (error) {
      setBookmarkedItems(prev =>
        hasLiked ? [...prev, noteId] : prev.filter((id) => id !== noteId)
      );
      setLikeCounts(prev => ({
        ...prev,
        [noteId]: Math.max((prev[noteId] || 0) + (hasLiked ? 1 : -1), 0),
      }));
      console.error("Error toggling like:", error);
    }
  }, [session?.user?.id, bookmarkedItems]);

  const uploadResource = async () => {
    if (!file || !session?.user) return alert("Missing file or user details.");

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "medrae_preset");
      formData.append("folder", "medrae_platform");

      const cloudName = "dpj5vprwf";
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || "Cloudinary upload failed");
      }

      const cloudinaryData = await response.json();
      const file_url = cloudinaryData.secure_url;

      const { data, error: dbError } = await supabase.from("notes").insert({
        title: uploadForm.title || file.name,
        description: uploadForm.description,
        block: uploadForm.block,
        course: uploadForm.course,
        file_url: file_url,
        file_type: uploadForm.fileType,
        uploaded_by: session.user.id,
        is_public: true,
        approved: true,
      }).select().single();

      if (dbError) throw dbError;

      if (isMounted.current) {
        setNotes((prev) => [data, ...prev]);
        notesCache.delete(`notes_public`);
        setUploadForm({
          title: "",
          description: "",
          block: "PTS",
          course: localStorage.getItem("selectedCourse") || "",
          fileType: "pdf",
        });
        setFile(null);
        setShowUploadForm(false);
        alert("Resource uploaded successfully to Cloudinary.");
      }
    } catch (err: any) {
      console.error("Upload process error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const uploadBatchResources = async (filesList: FileList) => {
    if (!filesList.length || !session?.user) return alert("Missing files or user session.");

    setUploading(true);
    setUploadProgress(0);

    const cloudName = "dpj5vprwf";
    const uploadPreset = "medrae_preset";
    const folderName = "medrae_platform_batch";

    let totalSize = Array.from(filesList).reduce((sum, f) => sum + f.size, 0);
    let uploadedSize = 0;

    const uploads = await Promise.all(
      Array.from(filesList).map(async (fileItem) => {
        uploadAbortController.current = new AbortController();

        const fileSize = fileItem.size;
        const progressInterval = setInterval(() => {
          uploadedSize += fileSize * 0.05;
          if (uploadedSize > totalSize) uploadedSize = totalSize;
          if (isMounted.current) setUploadProgress((uploadedSize / totalSize) * 100);
        }, 200);

        try {
          const formData = new FormData();
          formData.append("file", fileItem);
          formData.append("upload_preset", uploadPreset);
          formData.append("folder", folderName);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
            { method: "POST", body: formData, signal: uploadAbortController.current.signal }
          );

          clearInterval(progressInterval);

          if (!response.ok) return null;

          const cloudinaryData = await response.json();
          const fileBaseName = fileItem.name.replace(/\.[^/.]+$/, "");

          return {
            title: fileBaseName,
            description: uploadForm.description || fileBaseName,
            block: uploadForm.block,
            course: uploadForm.course,
            file_url: cloudinaryData.secure_url,
            file_type: "pdf",
            uploaded_by: session.user.id,
            is_public: true,
            approved: true,
          };
        } catch (err) {
          clearInterval(progressInterval);
          return null;
        }
      })
    );

    const validUploads = uploads.filter((item): item is NonNullable<typeof item> => item !== null);

    if (validUploads.length > 0 && isMounted.current) {
      const { data, error } = await supabase.from("notes").insert(validUploads).select();
      if (error) {
        console.error("Database sync error:", error);
        alert("Files uploaded to cloud, but database sync failed.");
      } else {
        alert(`Batch upload successful! ${validUploads.length} files processed.`);
        setNotes((prev) => [...(data || []), ...prev]);
        notesCache.delete(`notes_public`);
        setUploadForm({
          title: "",
          description: "",
          block: "PTS",
          course: localStorage.getItem("selectedCourse") || "",
          fileType: "pdf",
        });
        setFiles([]);
      }
    }

    setUploading(false);
    setTimeout(() => {
      if (isMounted.current) setUploadProgress(null);
    }, 1000);
  };

  const loadOfflineFile = async (fileId: string, fileUrl: string) => {
    const cachedFile = await getFile(fileId);
    if (cachedFile) {
      const url = URL.createObjectURL(cachedFile);
      window.open(url, "_blank");
      return;
    }
    window.open(fileUrl, "_blank");
  };

  const handleDownload = async (fileId: string, url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await saveFile(fileId, blob);
      if (isMounted.current) setOfflineFiles((prev) => [...prev, fileId]);
      alert("Saved offline!");
    } catch (err) {
      console.error("Failed to save offline:", err);
    }
  };

  // ORIGINAL handleViewNote - ONLY uses isPremium for access check
  const handleViewNote = useCallback(async (note: any) => {
    // ONLY isPremium determines access - NO tutor bypass
    if (!isPremium) {
      setSelectedNoteForOverlay(note);
      setShowPremiumOverlay(true);
      return;
    }

    try {
      const cachedFile = await getFile(note.id);
      const url = cachedFile ? URL.createObjectURL(cachedFile) : note.file_url;
      if (isMounted.current) setFullscreenNote({ ...note, file_url: url });

      const { error } = await supabase.from("note_views").upsert(
        { note_id: note.id, user_id: session?.user?.id || null },
        { onConflict: ['note_id', 'user_id'] }
      );

      if (!error && isMounted.current) {
        setViewCounts(prev => ({ ...prev, [note.id]: (prev[note.id] || 0) + 1 }));
      }
    } catch (err) {
      console.error("View error:", err);
    }
  }, [isPremium, session?.user?.id]);

  // ORIGINAL handleDownloadNote - ONLY uses isPremium for access check
  const handleDownloadNote = useCallback(async (note: any) => {
    // ONLY isPremium determines access - NO tutor bypass
    if (!isPremium) {
      setSelectedNoteForOverlay(note);
      setShowPremiumOverlay(true);
      return;
    }

    try {
      const res = await fetch(note.file_url);
      const blob = await res.blob();
      await saveFile(note.id, blob);
      if (isMounted.current) setOfflineFiles((prev) => [...prev, note.id]);
      alert("Saved offline!");
    } catch (err) {
      console.error("Failed to save offline:", err);
    }
  }, [isPremium]);

  const blockCategories = [
    { id: "PTS", name: "YR 1.O/PTS" },
    { id: "BLOCK 1", name: "YR 1.0/BLOCK 1" },
    { id: "BLOCK 2", name: "YR 1.1/BLOCK 2" },
    { id: "BLOCK 3", name: "YR 2.0/BLOCK 3" },
    { id: "BLOCK 4", name: "YR 2.1/BLOCK 4" },
    { id: "BLOCK 5", name: "YR 3.0/BLOCK 5" },
    { id: "BLOCK 6", name: "YR 3.1/BLOCK 6" },
    { id: "OTHER", name: "ADDITIONAL RESOURCES" },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-8 w-8 text-blue" fill="currentColor">
          <path d="M128 64C92.7 64 64 92.7 64 128L64 512C64 547.3 92.7 576 128 576L208 576L208 464C208 428.7 236.7 400 272 400L448 400L448 234.5C448 217.5 441.3 201.2 429.3 189.2L322.7 82.7C310.7 70.7 294.5 64 277.5 64L128 64zM389.5 240L296 240C282.7 240 272 229.3 272 216L272 122.5L389.5 240zM272 444C261 444 252 453 252 464L252 592C252 603 261 612 272 612C283 612 292 603 292 592L292 564L304 564C337.1 564 364 537.1 364 504C364 470.9 337.1 444 304 444L272 444zM304 524L292 524L292 484L304 484C315 484 324 493 324 504C324 515 315 524 304 524zM400 444C389 444 380 453 380 464L380 592C380 603 389 612 400 612L432 612C460.7 612 484 588.7 484 560L484 496C484 467.3 460.7 444 432 444L400 444zM420 572L420 484L432 484C438.6 484 444 489.4 444 496L444 560C444 566.6 438.6 572 432 572L420 572zM508 464L508 592C508 603 517 612 528 612C539 612 548 603 548 592L548 548L576 548C587 548 596 539 596 528C596 517 587 508 576 508L548 508L548 484L576 484C587 484 596 475 596 464C596 453 587 444 576 444L528 444C517 444 508 453 508 464z" />
        </svg>;
      case "video":
        return <Video className="h-4 w-4" />;
      case "link":
        return <Link className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "video":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "link":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (subscriptionLoading) {
    return <GlobalLoader message="Verifying subscription..." />;
  }

  return (
    <>
      {/* EDGE-TO-EDGE ON MOBILE - COMPLETELY REMOVED ALL PADDING/MARGINS */}
      <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] px-0 md:px-4 lg:px-6">
        <div className="w-full max-w-full space-y-0 md:space-y-6 py-0 md:py-6">
          <div className="w-full max-w-full mx-auto space-y-0 px-0 sm:px-6 pt-0 sm:pt-4">
            {/* REMOVED ALL CARD STYLING ON MOBILE - NO BORDERS, NO ROUNDED, NO PADDING */}
            <div className="relative overflow-hidden transition-all rounded-none sm:rounded-xl border-0 bg-white dark:bg-muted/30">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

              {/* REMOVED PADDING FROM HEADER ON MOBILE */}
              <CardHeader className="pb-2 relative px-3 md:px-6 pt-3 md:pt-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <Library className="h-6 w-6 md:h-7 md:w-7 text-blue-600 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                      Notes & <span className="text-blue-600">Resources</span>
                    </CardTitle>
                    <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5 md:mt-1">
                      KMTC & Private Institution Archive
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* REMOVED PADDING FROM CONTENT ON MOBILE */}
              <CardContent className="space-y-4 md:space-y-6 px-0 md:px-6 pb-0 md:pb-6">
                {/* Description Area - REMOVED PADDING ON MOBILE */}
                <div className="bg-gray-50/80 dark:bg-gray-900/50 rounded-none md:rounded-xl p-3 md:p-5 border-0 mx-0">
                  <motion.div layout>
                    <div className="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed font-medium">
                      <p>
                        Access a wide range of study materials and academic references.
                        Organized to align closely with the curriculum used in most Kenyan institutions.
                        {!showDescription && (
                          <button
                            onClick={() => setShowDescription(true)}
                            className="text-blue-600 dark:text-blue-400 font-bold ml-1 hover:underline underline-offset-4"
                          >
                            ... Read more
                          </button>
                        )}
                      </p>
                      <AnimatePresence>
                        {showDescription && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 md:pt-4 space-y-3 mt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                              <p className="text-xs md:text-sm">
                                This ensures diverse, high-quality content to support your learning,
                                research, and personal note uploads. While some notes may appear mixed,
                                they cover core blocks and semesters comprehensively.
                              </p>
                              <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl">
                                <Info className="w-3 h-3 md:w-4 md:h-4" /> Curriculum-aligned study references
                              </div>
                              <button
                                onClick={() => setShowDescription(false)}
                                className="text-[10px] md:text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline mt-2"
                              >
                                Show less
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>

                {/* SEARCH & UPLOAD TOOLBAR - NO PADDING ON MOBILE */}
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 px-0 md:px-0">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Search by topic, unit, course, institution..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 md:h-12 pl-9 md:pl-12 pr-3 md:pr-4 rounded-none md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-none text-gray-900 dark:text-white placeholder-gray-400 font-medium focus:ring-2 focus:ring-blue-500/50 transition-all outline-none text-sm md:text-base"
                    />
                  </div>
                  <Button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className={`h-10 md:h-12 px-4 md:px-6 rounded-none md:rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95 text-sm md:text-base ${showUploadForm
                      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:border-red-900/30 shadow-none"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none"
                      }`}
                  >
                    {showUploadForm ? <><X className="w-4 h-4" />Cancel</> : <><UploadCloud className="w-4 h-4" />New</>}
                  </Button>
                </div>

                {/* Upload Form - KEPT SAME BUT WITH REDUCED PADDING ON MOBILE */}
                <AnimatePresence>
                  {showUploadForm && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mt-2 md:mt-4 overflow-hidden rounded-none md:rounded-xl border-0 md:border border-gray-100 dark:border-gray-800 bg-white dark:bg-muted/30 shadow-2xl"
                    >
                      <div className="p-3 md:p-8 space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                            <UploadCloud className="w-5 h-5 text-emerald-600" />
                          </div>
                          <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Contribute to Library
                          </h2>
                        </div>
                        <div className="grid gap-4 md:gap-5 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Course (Optional)</label>
                            <Input
                              placeholder="e.g. Nursing BSc"
                              value={uploadForm.course}
                              onChange={(e) => {
                                const value = e.target.value;
                                setUploadForm({ ...uploadForm, course: value });
                                localStorage.setItem("selectedCourse", value);
                              }}
                              className="h-10 md:h-12 rounded-none md:rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Academic Block</label>
                            <select
                              value={uploadForm.block}
                              onChange={(e) => setUploadForm({ ...uploadForm, block: e.target.value })}
                              className="w-full h-10 md:h-12 rounded-none md:rounded-xl bg-gray-50 dark:bg-gray-900 border-none px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer"
                            >
                              {blockCategories.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Brief Description</label>
                            <Input
                              placeholder="What is this resource about?"
                              value={uploadForm.description}
                              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                              className="h-10 md:h-12 rounded-none md:rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Format Type</label>
                            <select
                              value={uploadForm.fileType}
                              onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                              className="w-full h-10 md:h-12 rounded-none md:rounded-xl bg-gray-50 dark:bg-gray-900 border-none px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer"
                            >
                              <option value="pdf">PDF Document</option>
                              <option value="video">Video Tutorial</option>
                              <option value="audio">Audio Lecture</option>
                              <option value="link">Web Link</option>
                            </select>
                          </div>
                        </div>
                        <div className="relative">
                          <label className="group block w-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-none md:rounded-2xl p-4 md:p-8 text-center hover:border-emerald-500 dark:hover:border-emerald-500/50 transition-all cursor-pointer bg-gray-50/50 dark:bg-gray-900/30">
                            <input
                              type="file"
                              accept=".pdf"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (!e.target.files) return;
                                const selected = Array.from(e.target.files);
                                setFiles(selected);
                                uploadBatchResources(e.target.files);
                              }}
                            />
                            <div className="flex flex-col items-center gap-2">
                              <div className="p-2 md:p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                <FilePlus className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                              </div>
                              <p className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300">
                                {files.length > 0 ? `${files.length} files selected` : "Click to select or drag PDF files"}
                              </p>
                              <p className="text-[8px] md:text-[10px] font-medium text-gray-400">Supported format: PDF (Max 50MB per file)</p>
                            </div>
                          </label>
                        </div>
                        {uploadProgress !== null && (
                          <div className="p-3 md:p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-none md:rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[8px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-widest animate-pulse">Uploading to Cloud...</span>
                              <span className="text-[10px] md:text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {(() => {
                                  const totalSize = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
                                  const uploaded = (uploadProgress / 100) * totalSize;
                                  return `${uploaded.toFixed(1)} / ${totalSize.toFixed(1)} MB (${Math.round(uploadProgress)}%)`;
                                })()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          {uploading ? (
                            <Button
                              variant="destructive"
                              onClick={() => {
                                uploadAbortController.current?.abort();
                                setUploading(false);
                                setUploadProgress(null);
                                setFiles([]);
                                alert("Upload process terminated.");
                              }}
                              className="flex-1 h-10 md:h-12 rounded-none md:rounded-2xl font-bold shadow-lg shadow-red-200 dark:shadow-none text-sm"
                            >
                              <XCircle className="w-4 h-4 mr-2" />Stop & Cancel
                            </Button>
                          ) : (
                            <Button
                              onClick={uploadResource}
                              disabled={files.length === 0}
                              className="flex-1 h-10 md:h-12 rounded-none md:rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 text-sm"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />Complete Submission
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* BLOCK SELECTOR TOOLBAR - FULL WIDTH, NO PADDING */}
                <div className="relative mt-4 md:mt-6 w-full flex justify-center px-0 sm:px-0">
                  <Button
                    onClick={() => setFloatingBlockOpen(!floatingBlockOpen)}
                    className={`relative z-40 h-10 md:h-12 px-4 md:px-6 rounded-none md:rounded-2xl transition-all duration-300 flex items-center gap-2 md:gap-3 w-full sm:w-auto shadow-lg active:scale-95 text-sm md:text-base ${floatingBlockOpen
                      ? "bg-blue-600 text-white shadow-blue-200 dark:shadow-none"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-800 hover:border-blue-500"
                      }`}
                  >
                    <div className={`p-1 md:p-1.5 rounded-lg transition-colors ${floatingBlockOpen ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                      <Layers className={`w-4 h-4 md:w-5 md:h-5 ${floatingBlockOpen ? 'text-white' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Category</span>
                      <span className="text-xs md:text-sm font-bold truncate max-w-[150px] md:max-w-[200px]">
                        {blockCategories.find(c => c.id === selectedBlock)?.name || "Select Block / Semester"}
                      </span>
                    </div>
                    <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2 transition-transform duration-300 ${floatingBlockOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  <AnimatePresence>
                    {floatingBlockOpen && (
                      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setFloatingBlockOpen(false)}
                          className="absolute inset-0 bg-gray-950/60 backdrop-blur-md"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="relative w-full max-w-md bg-white dark:bg-muted/80 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        >
                          <div className="px-8 pt-8 pb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                              Select Curriculum <span className="text-blue-600 font-normal underline decoration-2 underline-offset-4">Block</span>
                            </h3>
                            <p className="text-xs font-medium text-gray-400 mt-2">Filter resources by your current semester or level.</p>
                          </div>
                          <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                              {blockCategories.map((cat) => {
                                const isActive = selectedBlock === cat.id;
                                return (
                                  <button
                                    key={cat.id}
                                    onClick={() => {
                                      setSelectedBlock(cat.id);
                                      setFloatingBlockOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all group ${isActive
                                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                                      }`}
                                  >
                                    <span className={`text-sm font-bold ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                                      {cat.name}
                                    </span>
                                    {isActive ? <CheckCircle2 className="w-5 h-5 fill-current" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-100 dark:border-gray-800 group-hover:border-blue-200 transition-colors" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                            <Button onClick={() => setFloatingBlockOpen(false)} className="w-full bg-white dark:bg-gray-800 text-gray-500 font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100">
                              Close Menu
                            </Button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* RESOURCES GRID - NO PADDING, NO MARGIN ON MOBILE */}
                <div className="space-y-3 md:space-y-4 mt-2 md:mt-4 px-0 sm:px-0">
                  <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 text-center px-2 md:px-0">
                    {blockCategories.find((cat) => cat.id === selectedBlock)?.name?.split("/").pop()}
                  </h2>
                  {blockCategories.filter((cat) => cat.id === selectedBlock).map((cat) => (
                    <div key={cat.id}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-3 lg:gap-4 w-full">
                        {loadingNotes ? (
                          // SKELETON LOADERS - 6 cards while loading
                          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : filteredResources.filter((note) =>
                          cat.id === "OTHER"
                            ? !blockCategories.slice(0, 7).some((b) => (note.block || "").toUpperCase() === b.id)
                            : (note.block || "").toUpperCase() === cat.id
                        ).length === 0 ? (
                          <div className="col-span-full flex flex-col items-center justify-center py-8 md:py-12 px-4 md:px-6 border-0 shadow-md rounded-none md:rounded-xl">
                            <div className="text-center">
                              <CardTitle className="text-base md:text-lg text-center text-muted-foreground">No notes available</CardTitle>
                              <CardDescription className="text-center text-muted-foreground text-xs md:text-sm">Check back soon for updates!</CardDescription>
                            </div>
                          </div>
                        ) : (
                          filteredResources.filter((note) =>
                            cat.id === "OTHER"
                              ? !blockCategories.slice(0, 7).some((b) => (note.block || "").toUpperCase() === b.id)
                              : (note.block || "").toUpperCase() === cat.id
                          ).map((note, index) => (
                            <React.Fragment key={note.id}>
                              {/* CARD - COMPLETELY EDGE-TO-EDGE ON MOBILE */}
                              <div
                                className="group flex flex-col justify-between transition-all duration-300 border-0 border-b border-gray-100 dark:border-gray-800 sm:border sm:rounded-xl hover:border-blue-500/50 bg-white dark:bg-gray-800 rounded-none shadow-sm hover:shadow-xl overflow-hidden cursor-pointer"
                                onClick={() => setDetailsOverlayNote(note)}
                              >
                                <div className="p-3 md:p-5 pb-1 md:pb-2">
                                  <div className="space-y-2 md:space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-1.5 md:gap-2">
                                        <div className="p-1.5 md:p-2 bg-gray-50 dark:bg-gray-900 rounded-lg md:rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                          {getTypeIcon(note.file_type)}
                                        </div>
                                        <Badge className={`${getTypeColor(note.file_type)} border-none font-bold text-[8px] md:text-[10px] tracking-widest px-1.5 md:px-2`}>
                                          {note.file_type?.toUpperCase() || "PDF"}
                                        </Badge>
                                      </div>
                                      {offlineFiles.includes(note.id) && (
                                        <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">
                                          <CloudCheck className="w-2 h-2 md:w-3 md:h-3" /> PRESERVED
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-0.5 md:space-y-1">
                                      <CardTitle className="text-base md:text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {note.title}
                                      </CardTitle>
                                      <CardDescription className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 line-clamp-2 md:line-clamp-3 leading-relaxed">
                                        {note.description || "No description provided"}
                                      </CardDescription>
                                    </div>

                                    {/* ALL COLUMNS DISPLAYED - SMALLER ON MOBILE */}
                                    <div className="flex flex-wrap gap-1 pt-0.5 md:pt-1">
                                      {note.course && (
                                        <Badge variant="outline" className="text-[7px] md:text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 px-1 md:px-2">
                                          <BookOpen className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 mr-0.5 md:mr-1" />
                                          {note.course}
                                        </Badge>
                                      )}
                                      {note.unit && (
                                        <Badge variant="outline" className="text-[7px] md:text-[10px] font-medium bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 px-1 md:px-2">
                                          <Tag className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 mr-0.5 md:mr-1" />
                                          {note.unit}
                                        </Badge>
                                      )}
                                      {note.institution && (
                                        <Badge variant="outline" className="text-[7px] md:text-[10px] font-medium bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 px-1 md:px-2">
                                          <Building className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 mr-0.5 md:mr-1" />
                                          {note.institution}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 md:gap-2 pt-0.5 md:pt-1">
                                      <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-0.5 md:gap-1">
                                        <Calendar className="w-2 h-2 md:w-3 md:h-3" />
                                        {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                      {note.is_featured && (
                                        <span className="text-[7px] md:text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1 md:px-2 py-0.5 rounded-md flex items-center gap-0.5 md:gap-1">
                                          <Sparkles className="w-2 h-2 md:w-3 md:h-3" /> Featured
                                        </span>
                                      )}
                                      {note.download_count > 0 && (
                                        <span className="text-[8px] md:text-[10px] font-bold text-gray-400 flex items-center gap-0.5 md:gap-1">
                                          <Download className="w-2 h-2 md:w-3 md:h-3" /> {note.download_count}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3 md:p-5 pt-1 md:pt-2 space-y-3 md:space-y-5">
                                  {/* Tags section */}
                                  {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {note.tags.slice(0, 3).map((tag: string, i: number) => (
                                        <span key={i} className="text-[7px] md:text-[9px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 md:px-2 py-0.5 rounded-md">
                                          #{tag}
                                        </span>
                                      ))}
                                      {note.tags.length > 3 && (
                                        <span className="text-[7px] md:text-[9px] font-medium text-gray-400">+{note.tags.length - 3} more</span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 border-t border-gray-50 dark:border-gray-900 pt-2 md:pt-4">
                                    {note.file_type === "pdf" && (
                                      <>
                                        <Button size="sm" variant="secondary" className="rounded-md md:rounded-xl font-bold gap-1 md:gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 transition-all active:scale-95 border-none text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewNote(note);
                                          }}>
                                          {!isPremium && <Lock className="h-2 w-2 md:h-3 md:w-3" />}<Eye className="h-3 w-3 md:h-4 md:w-4" /> View
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadNote(note);
                                        }}
                                          className="rounded-md md:rounded-xl font-bold gap-1 md:gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-all active:scale-95 border-none text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
                                          {!isPremium && <Lock className="h-2 w-2 md:h-3 md:w-3" />}<DownloadCloud className="h-3 w-3 md:h-4 md:w-4" /> Cache
                                        </Button>
                                      </>
                                    )}
                                    {session?.user?.id === note.uploaded_by && (
                                      <Button size="sm" variant="ghost" className="rounded-md md:rounded-xl p-1.5 md:p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all ml-auto h-7 md:h-9"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!confirm("Delete this resource forever?")) return;
                                          try {
                                            const storagePath = note.file_url.split("/notes/")[1];
                                            if (storagePath) await supabase.storage.from("notes").remove([storagePath]);
                                            await supabase.from("notes").delete().eq("id", note.id);
                                            if (isMounted.current) setNotes(prev => prev.filter(n => n.id !== note.id));
                                          } catch (err) { alert("Failed to delete resource"); }
                                        }}>
                                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 p-2 md:p-3 rounded-lg md:rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2 md:gap-4">
                                      <div className="flex items-center gap-1 group/stat">
                                        <div className="p-1 bg-white dark:bg-gray-800 rounded shadow-sm"><Eye className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-blue-500" /></div>
                                        <span className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">{viewCounts[note.id] || 0}</span>
                                      </div>
                                      <button onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLike(note.id);
                                      }} className="flex items-center gap-1 group/like transition-transform active:scale-125">
                                        <div className={`p-1 rounded shadow-sm transition-colors ${bookmarkedItems.includes(note.id) ? 'bg-red-50 dark:bg-red-900/30' : 'bg-white dark:bg-gray-800'}`}>
                                          <Heart className={`h-2.5 w-2.5 md:h-3.5 md:w-3.5 ${bookmarkedItems.includes(note.id) ? "text-red-500 fill-current" : "text-gray-400"}`} />
                                        </div>
                                        <span className={`text-[10px] md:text-xs font-bold ${bookmarkedItems.includes(note.id) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                          {likeCounts[note.id] || 0}
                                        </span>
                                      </button>
                                    </div>
                                    <div className="text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">Library</div>
                                  </div>
                                </div>
                              </div>

                              {/* UnitPics image after every 4 cards */}
                              <UnitPics position={index + 1} />
                            </React.Fragment>
                          ))
                        )}
                      </div>
                      <TermsButton />
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </div>

          {fullscreenNote && (
            <div ref={fullscreenRef} className="fixed inset-0 bg-black z-50 flex flex-col">
              <div className="flex justify-end p-2">
                <Button onClick={() => setFullscreenNote(null)} variant="ghost" className="text-white"><X className="h-6 w-6" /></Button>
              </div>
              {fullscreenNote.file_type === 'pdf' ? (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <Viewer fileUrl={fullscreenNote.file_url} plugins={[defaultLayoutPluginInstance]} theme={isDarkMode ? "dark" : "light"} renderLoader={() => <GlobalLoader message="Medrae is Downloading PDF..." />} />
                </Worker>
              ) : (
                <iframe src={fullscreenNote.file_url} className="flex-1 w-full" style={{ border: "none" }} title={fullscreenNote.title} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* PREMIUM UPGRADE OVERLAY - same as before */}
      <AnimatePresence>
        {showPremiumOverlay && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPremiumOverlay(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              <div className={`relative p-8 text-center ${isTutor ? 'bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500' : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'}`}>
                <div className="absolute top-0 right-0 p-4"><button onClick={() => setShowPremiumOverlay(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button></div>
                <div className={`w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm`}>
                  {isTutor ? <GraduationCap className="w-12 h-12 text-white" /> : <Lock className="w-12 h-12 text-white" />}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{isTutor ? "Tutor Pro Access Required" : "Premium Resource"}</h3>
                <p className="text-white/90 text-sm">{selectedNoteForOverlay?.title}</p>
              </div>
              <div className="p-8">
                <div className="space-y-4 mb-8">
                  {subscriptionInfoForDisplay.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center mb-6">
                  <span className="text-3xl font-bold">{subscriptionInfoForDisplay.currency} {subscriptionInfoForDisplay.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400"> / {subscriptionInfoForDisplay.duration}</span>
                </div>

                <button
                  onClick={() => {
                    setShowPremiumOverlay(false);
                    navigate("/subscription", { state: { role: isTutor ? "tutor" : "student" } });
                  }}
                  className={`w-full font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group mb-3 ${isTutor
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{isTutor ? `Upgrade to Tutor Pro — ${subscriptionInfoForDisplay.currency} ${subscriptionInfoForDisplay.price}` : `Unlock All — ${subscriptionInfoForDisplay.currency} ${subscriptionInfoForDisplay.price} for ${subscriptionInfoForDisplay.duration}`}</span>
                </button>
                <button onClick={() => setShowPremiumOverlay(false)} className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium">Maybe later</button>
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
                <div className="flex justify-between items-center p-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(detailsOverlayNote.file_type)}
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 line-clamp-1">
                      {detailsOverlayNote.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setDetailsOverlayNote(null)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content - more padding on mobile for readability */}
              <div className="p-4 md:p-5 space-y-5">
                {/* Description section */}
                {detailsOverlayNote.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Description
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {detailsOverlayNote.description}
                    </p>
                  </div>
                )}

                {/* Details grid - NOW SHOWS ALL COLUMNS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {detailsOverlayNote.course && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Course</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{detailsOverlayNote.course}</p>
                    </div>
                  )}
                  {detailsOverlayNote.unit && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Unit</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{detailsOverlayNote.unit}</p>
                    </div>
                  )}
                  {detailsOverlayNote.block && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Block</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{detailsOverlayNote.block}</p>
                    </div>
                  )}
                  {detailsOverlayNote.institution && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Institution</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{detailsOverlayNote.institution}</p>
                    </div>
                  )}
                  {detailsOverlayNote.file_type && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">File Type</p>
                      <Badge className={getTypeColor(detailsOverlayNote.file_type)}>
                        {detailsOverlayNote.file_type?.toUpperCase() || "PDF"}
                      </Badge>
                    </div>
                  )}
                  {detailsOverlayNote.category && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{detailsOverlayNote.category}</p>
                    </div>
                  )}
                  {detailsOverlayNote.sub_category && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sub Category</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{detailsOverlayNote.sub_category}</p>
                    </div>
                  )}
                  {detailsOverlayNote.usage_type && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Usage Type</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{detailsOverlayNote.usage_type}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(detailsOverlayNote.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {detailsOverlayNote.tags && detailsOverlayNote.tags.length > 0 && (
                    <div className="space-y-0.5 col-span-full">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detailsOverlayNote.tags.map((tag: string, i: number) => (
                          <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {viewCounts[detailsOverlayNote.id] || 0} views
                    </span>
                    <button
                      className={`flex items-center gap-1 transition-colors ${bookmarkedItems.includes(detailsOverlayNote.id) ? "text-red-500" : "text-gray-600 dark:text-gray-400"
                        }`}
                      onClick={() => toggleLike(detailsOverlayNote.id)}
                    >
                      <Heart className={`h-4 w-4 ${bookmarkedItems.includes(detailsOverlayNote.id) ? "fill-current" : ""}`} />
                      {likeCounts[detailsOverlayNote.id] || 0} likes
                    </button>
                    {detailsOverlayNote.download_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Download className="h-4 w-4" /> {detailsOverlayNote.download_count} downloads
                      </span>
                    )}
                  </div>
                  {offlineFiles.includes(detailsOverlayNote.id) && (
                    <Badge variant="outline" className="text-[10px]">Saved Offline</Badge>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    className="w-full sm:flex-1 rounded-xl"
                    onClick={() => {
                      setDetailsOverlayNote(null);
                      handleViewNote(detailsOverlayNote);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Document
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1 rounded-xl"
                    onClick={() => {
                      setDetailsOverlayNote(null);
                      handleDownloadNote(detailsOverlayNote);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Save Offline
                  </Button>
                </div>

                {/* Premium note warning */}
                {!isPremium && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
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