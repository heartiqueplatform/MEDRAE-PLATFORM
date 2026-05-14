"use client";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed
import { TermsButton } from "@/components/ui/TermsButton";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import "../styles/pdfOverrides.css";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
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
  Layers,
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
} from "lucide-react";
import { saveFile, getFile } from "@/lib/offlineStorage";

export function Resources() {

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
  // ✅ Batch upload function with realtime progress
  const uploadBatchResources = async (files: FileList) => {
    if (!files.length || !session?.user) return alert("Missing files or user.");

    setUploading(true);
    setUploadProgress(0);

    // Track per-file progress
    let totalSize = Array.from(files).reduce((sum, f) => sum + f.size, 0);
    let uploadedSize = 0;

    const uploads = await Promise.all(
      Array.from(files).map(async (file) => {
        const filePath = `${Date.now()}_${file.name}`;
        uploadAbortController.current = new AbortController();

        // Fake per-file progress simulation
        const fileSize = file.size;
        let fileUploaded = 0;

        const progressInterval = setInterval(() => {
          // simulate upload in chunks
          fileUploaded += fileSize * 0.1;
          if (fileUploaded > fileSize) fileUploaded = fileSize;

          uploadedSize += fileSize * 0.1;
          if (uploadedSize > totalSize) uploadedSize = totalSize;

          setUploadProgress((uploadedSize / totalSize) * 100);
        }, 300);

        try {
          const { error: storageError } = await supabase.storage
            .from("notes")
            .upload(filePath, file, {
              signal: uploadAbortController.current.signal,
            });

          clearInterval(progressInterval);

          if (storageError) {
            console.error("Storage error", storageError);
            return null;
          }

          const file_url = supabase.storage
            .from("notes")
            .getPublicUrl(filePath).data.publicUrl;

          const fileBaseName = file.name.replace(/\.pdf$/i, "");

          return {
            title: fileBaseName,
            description: fileBaseName,
            block: uploadForm.block,
            course: uploadForm.course,
            file_url,
            file_type: "pdf",
            uploaded_by: session.user.id,
          };
        } catch (err) {
          clearInterval(progressInterval);
          console.error("Upload aborted or failed:", err);
          return null;
        }
      })
    );

    const validUploads = uploads.filter(Boolean);

    if (validUploads.length > 0) {
      const { error } = await supabase.from("notes").insert(validUploads);

      if (error) {
        console.error("DB insert error", error);
        alert("Upload failed");
      } else {
        alert("Batch upload successful!");
        setNotes((prev) => [...validUploads, ...prev]);

        setUploadForm({
          title: "",
          description: "",
          block: "PTS",
          course: localStorage.getItem("selectedCourse") || "",
          fileType: "pdf",
        });
      }
    }

    setUploading(false);
    setTimeout(() => setUploadProgress(null), 1000); // hide after 1s
  };

  useEffect(() => {
    const checkDark = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));

    checkDark(); // initial check

    // Optional: observe class changes if Tailwind dark mode toggles dynamically
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);


  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
    };
    getSession();
  }, []);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fullscreenNote, setFullscreenNote] = useState<any>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const cachedNotes = localStorage.getItem("cachedNotes");
  const [notes, setNotes] = useState<any[]>(cachedNotes ? JSON.parse(cachedNotes) : []);
  const [loadingNotes, setLoadingNotes] = useState(!cachedNotes); // ✅ only true if no cache


  const loadOfflineFile = async (fileId: string, fileUrl: string) => {
    // Try getting the file from offline storage first
    const file = await getFile(fileId);
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
      return;
    }

    // If not offline, fallback to opening original URL
    window.open(fileUrl, "_blank");
  };
  const handleDownload = async (fileId: string, url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await saveFile(fileId, blob);
      console.log(`File ${fileId} saved for offline use`);

      // ✅ Mark this file as offline
      setOfflineFiles((prev) => [...prev, fileId]);

      alert("Saved offline!");
    } catch (err) {
      console.error("Failed to save offline:", err);
    }
  };



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
  useEffect(() => {
    const fetchNotes = async () => {
      // ✅ Try loading from localStorage first
      const cachedNotes = localStorage.getItem("cachedNotes");
      if (cachedNotes) {
        setNotes(JSON.parse(cachedNotes));
        setLoadingNotes(false); // skip loader if cached
        return;
      }

      setLoadingNotes(true); // only show loader if no cached notes

      // Fetch all approved public notes/videos from Supabase
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("is_public", true)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        setNotes([]);
      } else {
        setNotes(data || []);
        // ✅ Save to localStorage
        localStorage.setItem("cachedNotes", JSON.stringify(data || []));
      }

      setLoadingNotes(false);
    };

    fetchNotes();

    // ✅ Subscribe to realtime changes for notes/videos
    const channel = supabase
      .channel("notes-videos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new.is_public && payload.new.approved) {
            setNotes((prev) => {
              const updated = [payload.new, ...prev];
              localStorage.setItem("cachedNotes", JSON.stringify(updated)); // update cache
              return updated;
            });
          }

          if (payload.eventType === "UPDATE") {
            setNotes((prev) => {
              const updated = prev.map((n) =>
                n.id === payload.new.id ? payload.new : n
              );
              localStorage.setItem("cachedNotes", JSON.stringify(updated)); // update cache
              return updated;
            });
          }

          if (payload.eventType === "DELETE") {
            setNotes((prev) => {
              const updated = prev.filter((n) => n.id !== payload.old.id);
              localStorage.setItem("cachedNotes", JSON.stringify(updated)); // update cache
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);



  // ✅ Realtime subscription for notes table
  useEffect(() => {
    const channel = supabase
      .channel("notes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          console.log("Realtime change:", payload);

          if (payload.eventType === "INSERT") {
            setNotes((prev) => [payload.new as any, ...prev]);
          }

          if (payload.eventType === "UPDATE") {
            setNotes((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
          }

          if (payload.eventType === "DELETE") {
            setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!notes.length) return;

      const [likesRes, viewsRes, userLikesRes] = await Promise.all([
        supabase.from("note_likes").select("note_id"),
        supabase.from("note_views").select("note_id"),
        session?.user
          ? supabase
            .from("note_likes")
            .select("note_id")
            .eq("user_id", session.user.id)
          : { data: [] },
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

      setLikeCounts(likesMap);
      setViewCounts(viewsMap);
      setBookmarkedItems(userLiked);
    };

    fetchStats();
  }, [notes, session]);


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
        (note.description || "").toLowerCase().includes(searchTerm.toLowerCase()))
      &&
      (uploadForm.course ? (note.course || "").toUpperCase() === uploadForm.course.toUpperCase() : true)
  );


  // ✅ Like toggle function with optimistic UI
  const toggleLike = async (noteId: string) => {
    if (!session?.user?.id) return alert("Ooops no internet! Reconnect to internet");

    const hasLiked = bookmarkedItems.includes(noteId);

    // 🔹 Optimistic UI update
    if (hasLiked) {
      setBookmarkedItems((prev) => prev.filter((id) => id !== noteId));
      setLikeCounts((prev) => ({
        ...prev,
        [noteId]: Math.max((prev[noteId] || 1) - 1, 0),
      }));
    } else {
      setBookmarkedItems((prev) => [...prev, noteId]);
      setLikeCounts((prev) => ({
        ...prev,
        [noteId]: (prev[noteId] || 0) + 1,
      }));
    }

    // 🔹 Then sync with Supabase
    if (hasLiked) {
      const { error } = await supabase
        .from("note_likes")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error unliking:", error);
        // rollback UI if failed
        setBookmarkedItems((prev) => [...prev, noteId]);
        setLikeCounts((prev) => ({
          ...prev,
          [noteId]: (prev[noteId] || 0) + 1,
        }));
      }
    } else {
      const { error } = await supabase
        .from("note_likes")
        .insert([{ note_id: noteId, user_id: session.user.id }]);

      if (error) {
        console.error("Error liking:", error);
        // rollback UI if failed
        setBookmarkedItems((prev) => prev.filter((id) => id !== noteId));
        setLikeCounts((prev) => ({
          ...prev,
          [noteId]: Math.max((prev[noteId] || 1) - 1, 0),
        }));
      }
    }
  };


  const uploadResource = async () => {

    if (!file || !session?.user) return alert("Missing file or user.");
    setUploading(true);

    const filePath = `${Date.now()}_${file.name}`;
    uploadAbortController.current = new AbortController(); // 🔹 create controller FIRST

    // Fake progress simulation
    const totalMB = file.size / (1024 * 1024);
    let uploadedMB = 0;

    const progressInterval = setInterval(() => {
      uploadedMB += totalMB * 0.1; // simulate 10% progress increment
      if (uploadedMB >= totalMB) uploadedMB = totalMB;
      setUploadProgress((uploadedMB / totalMB) * 100);
    }, 300);

    try {
      const { error: storageError } = await supabase.storage
        .from("notes")
        .upload(filePath, file, {
          signal: uploadAbortController.current.signal,
        });

      clearInterval(progressInterval); // ✅ stop fake progress once done

      if (storageError) {
        console.error("Storage error", storageError);
        setUploading(false);
        setTimeout(() => setUploadProgress(null), 1000); // hide bar after 1s
        return;
      }

      const file_url = supabase.storage
        .from("notes")
        .getPublicUrl(filePath).data.publicUrl;

      const { error: dbError } = await supabase.from("notes").insert({
        title: uploadForm.title,
        description: uploadForm.description,
        block: uploadForm.block,
        course: uploadForm.course,
        file_url,
        file_type: uploadForm.fileType,
        uploaded_by: session.user.id,
      });

      if (dbError) {
        console.error("DB error", dbError);
        alert("Upload failed");
      } else {
        alert("Upload successful!");

        // ✅ Immediately update UI without waiting for subscription
        setNotes((prev) => [
          {
            id: crypto.randomUUID(),
            title: uploadForm.title,
            description: uploadForm.description,
            block: uploadForm.block,
            course: uploadForm.course,
            file_type: uploadForm.fileType,
            file_url,
            created_at: new Date().toISOString(),
            uploaded_by: session.user.id,
          },
          ...prev,
        ]);

        // ✅ Reset form + file
        setUploadForm({
          title: "",
          description: "",
          block: "PTS",
          course: "",
          fileType: "pdf",
        });
        setFile(null);
        setShowUploadForm(false);
      }
    } catch (err) {
      console.error("Upload aborted or failed:", err);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className="h-8 w-8 text-blue" // size: 32px x 32px, color: black
          fill="currentColor"           // uses text-black or any Tailwind text color
        >
          <path d="M128 64C92.7 64 64 92.7 64 128L64 512C64 547.3 92.7 576 128 576L208 576L208 464C208 428.7 236.7 400 272 400L448 400L448 234.5C448 217.5 441.3 201.2 429.3 189.2L322.7 82.7C310.7 70.7 294.5 64 277.5 64L128 64zM389.5 240L296 240C282.7 240 272 229.3 272 216L272 122.5L389.5 240zM272 444C261 444 252 453 252 464L252 592C252 603 261 612 272 612C283 612 292 603 292 592L292 564L304 564C337.1 564 364 537.1 364 504C364 470.9 337.1 444 304 444L272 444zM304 524L292 524L292 484L304 484C315 484 324 493 324 504C324 515 315 524 304 524zM400 444C389 444 380 453 380 464L380 592C380 603 389 612 400 612L432 612C460.7 612 484 588.7 484 560L484 496C484 467.3 460.7 444 432 444L400 444zM420 572L420 484L432 484C438.6 484 444 489.4 444 496L444 560C444 566.6 438.6 572 432 572L420 572zM508 464L508 592C508 603 517 612 528 612C539 612 548 603 548 592L548 548L576 548C587 548 596 539 596 528C596 517 587 508 576 508L548 508L548 484L576 484C587 484 596 475 596 464C596 453 587 444 576 444L528 444C517 444 508 453 508 464z" />
        </svg>
          ;
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
  if (loadingNotes) {
    return <GlobalLoader message="Medrae is preparing your notes..." />;
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)]  ">
      <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6">

        <div className="w-full max-w-6xl mx-auto space-y-4 px-0 sm:px-6 pt-0 sm:pt-4">

          {/* MAIN RESOURCES HEADER CARD */}
          <Card className="relative overflow-hidden shadow-xl shadow-blue-500/5 transition-all rounded-none sm:rounded-[2.5rem] border-0 bg-white dark:bg-gray-900">

            {/* Professional Accent Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

            <CardHeader className="pb-2 relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                  <Library className="h-7 w-7 text-blue-600 animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                    Notes & <span className="text-blue-600">Resources</span>
                  </CardTitle>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                    KMTC & Private Institution Archive
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Description Area */}
              <div className="bg-gray-50/80 dark:bg-gray-900/50 rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
                <motion.div layout>
                  <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium">
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
                          <div className="pt-4 space-y-3 mt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                            <p className="text-sm">
                              This ensures diverse, high-quality content to support your learning,
                              research, and personal note uploads. While some notes may appear mixed,
                              they cover core blocks and semesters comprehensively.
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl">
                              <Info className="w-4 h-4" /> Curriculum-aligned study references
                            </div>
                            <button
                              onClick={() => setShowDescription(false)}
                              className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline mt-2"
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

              {/* SEARCH & UPLOAD TOOLBAR */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search by topic, unit, or file name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-2xl bg-gray-100 dark:bg-gray-900 border-none
                text-gray-900 dark:text-white placeholder-gray-400 font-medium
                focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                  />
                </div>

                <Button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className={`h-12 px-6 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95
              ${showUploadForm
                      ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:border-red-900/30 shadow-none"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none"
                    }`}
                >
                  {showUploadForm ? (
                    <>
                      <X className="w-4 h-4" />
                      Cancel Upload
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      New Upload
                    </>
                  )}
                </Button>
              </div>
            </CardContent>


            <AnimatePresence>
              {showUploadForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl"
                >
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                        <UploadCloud className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Contribute to Library
                      </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      {/* Course Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Course (Optional)</label>
                        <Input
                          placeholder="e.g. Nursing BSc"
                          value={uploadForm.course}
                          onChange={(e) => {
                            const value = e.target.value;
                            setUploadForm({ ...uploadForm, course: value });
                            localStorage.setItem("selectedCourse", value);
                          }}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      {/* Block Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Academic Block</label>
                        <select
                          value={uploadForm.block}
                          onChange={(e) => setUploadForm({ ...uploadForm, block: e.target.value })}
                          className="w-full h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-none px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer"
                        >
                          {blockCategories.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Brief Description</label>
                        <Input
                          placeholder="What is this resource about?"
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      {/* File Type */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Format Type</label>
                        <select
                          value={uploadForm.fileType}
                          onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                          className="w-full h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-none px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer"
                        >
                          <option value="pdf">📄 PDF Document</option>
                          <option value="video">🎥 Video Tutorial</option>
                          <option value="audio">🎧 Audio Lecture</option>
                          <option value="link">🔗 Web Link</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom File Upload Zone */}
                    <div className="relative">
                      <label className="group block w-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center hover:border-emerald-500 dark:hover:border-emerald-500/50 transition-all cursor-pointer bg-gray-50/50 dark:bg-gray-900/30">
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
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <FilePlus className="w-6 h-6 text-emerald-500" />
                          </div>
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {files.length > 0 ? `${files.length} files selected` : "Click to select or drag PDF files"}
                          </p>
                          <p className="text-[10px] font-medium text-gray-400">Supported format: PDF (Max 50MB per file)</p>
                        </div>
                      </label>
                    </div>

                    {/* Progress Section */}
                    {uploadProgress !== null && (
                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest animate-pulse">Uploading to Cloud...</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {uploading ? (
                        <Button
                          variant="destructive"
                          onClick={() => {
                            uploadAbortController.current?.abort();
                            setUploading(false);
                            setUploadProgress(null);
                            setFiles([]);
                            setUploadForm({
                              course: localStorage.getItem("selectedCourse") || "",
                              description: "",
                              block: "PTS",
                              fileType: "pdf",
                            });
                            alert("Upload process terminated.");
                          }}
                          className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-red-200 dark:shadow-none"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Stop & Cancel
                        </Button>
                      ) : (
                        <Button
                          onClick={uploadResource}
                          disabled={files.length === 0}
                          className="flex-1 h-12 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Complete Submission
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- BLOCK SELECTOR TOOLBAR --- */}
            <div className="relative mt-6 w-full flex justify-center px-2 sm:px-0">

              {/* Trigger Button */}
              <Button
                onClick={() => setFloatingBlockOpen(!floatingBlockOpen)}
                className={`
      relative z-40 h-12 px-6 rounded-2xl transition-all duration-300
      flex items-center gap-3 w-full sm:w-auto shadow-lg active:scale-95
      ${floatingBlockOpen
                    ? "bg-blue-600 text-white shadow-blue-200 dark:shadow-none"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-800 hover:border-blue-500"
                  }
    `}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${floatingBlockOpen ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                  <Layers className={`w-5 h-5 ${floatingBlockOpen ? 'text-white' : 'text-blue-600'}`} />
                </div>

                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Category</span>
                  <span className="text-sm font-bold truncate max-w-[200px]">
                    {blockCategories.find(c => c.id === selectedBlock)?.name || "Select Block / Semester"}
                  </span>
                </div>

                <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${floatingBlockOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* MODAL OVERLAY */}
              <AnimatePresence>
                {floatingBlockOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Blurred Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setFloatingBlockOpen(false)}
                      className="absolute inset-0 bg-gray-950/60 backdrop-blur-md"
                    />

                    {/* Selection Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative w-full max-w-md bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                      {/* Modal Header */}
                      <div className="px-8 pt-8 pb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                          Select Curriculum <span className="text-blue-600 font-normal underline decoration-2 underline-offset-4">Block</span>
                        </h3>
                        <p className="text-xs font-medium text-gray-400 mt-2">Filter resources by your current semester or level.</p>
                      </div>

                      {/* List Content */}
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
                                className={`
                      w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all group
                      ${isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                                  }
                    `}
                              >
                                <span className={`text-sm font-bold ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                                  {cat.name}
                                </span>

                                {isActive ? (
                                  <CheckCircle2 className="w-5 h-5 fill-current" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-100 dark:border-gray-800 group-hover:border-blue-200 transition-colors" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Close (For Mobile UX) */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                        <Button
                          onClick={() => setFloatingBlockOpen(false)}
                          className="w-full bg-white dark:bg-gray-800 text-gray-500 font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                        >
                          Close Menu
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>


            {/* Tabs content controlled by selectedBlock */}
            <div className="space-y-4 mt-2 px-2 sm:px-0">

              {/* Dynamic Heading for Selected Block */}
              <h2 className="text-2xl font-bold mb-4 text-center">
                {blockCategories.find((cat) => cat.id === selectedBlock)?.name?.split("/").pop()}
              </h2>
              {blockCategories
                .filter((cat) => cat.id === selectedBlock)
                .map((cat) => (
                  <div key={cat.id}>
                    <div className="grid grid-cols-1  sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                      {loadingNotes ? (
                        <div className="flex flex-col items-center justify-center py-20 col-span-full">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-muted-foreground text-center">
                            Medrae is preparing your notes...
                          </p>
                        </div>
                      ) : filteredResources.filter((note) =>
                        cat.id === "OTHER"
                          ? !blockCategories
                            .slice(0, 7)
                            .some((b) => (note.block || "").toUpperCase() === b.id)
                          : (note.block || "").toUpperCase() === cat.id
                      ).length === 0 ? (
                        <Card className="col-span-full flex flex-col items-center justify-center py-12 px-6 border-0 shadow-md rounded-2xl">
                          <CardHeader>
                            <CardTitle className="text-lg text-center text-muted-foreground">
                              No notes available
                            </CardTitle>
                            <CardDescription className="text-center text-muted-foreground">
                              Check back soon for updates!
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ) : (
                        filteredResources
                          .filter((note) =>
                            cat.id === "OTHER"
                              ? !blockCategories
                                .slice(0, 7)
                                .some((b) => (note.block || "").toUpperCase() === b.id)
                              : (note.block || "").toUpperCase() === cat.id
                          )
                          .map((note) => (
                            <Card
                              key={note.id}
                              className="group flex flex-col justify-between transition-all duration-300 border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm hover:shadow-xl overflow-hidden"
                            >
                              <CardHeader className="p-5 pb-2">
                                <div className="space-y-3">
                                  {/* Top Row: Type & Meta */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                        {getTypeIcon(note.file_type)}
                                      </div>
                                      <Badge className={`${getTypeColor(note.file_type)} border-none font-bold text-[10px] tracking-widest`}>
                                        {note.file_type.toUpperCase()}
                                      </Badge>
                                    </div>

                                    {/* Offline Status Indicator */}
                                    {offlineFiles.includes(note.id) && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                        <CloudCheck className="w-3 h-3" /> PRESERVED
                                      </div>
                                    )}
                                  </div>

                                  {/* Title & Description */}
                                  <div className="space-y-1">
                                    <CardTitle className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors line-clamp-1">
                                      {note.title}
                                    </CardTitle>
                                    <CardDescription className="text-sm font-medium text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                      {note.description}
                                    </CardDescription>
                                  </div>

                                  {/* Metadata Pills */}
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {note.course && (
                                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md">
                                        {note.course}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="p-5 pt-2 space-y-5">
                                {/* Action Buttons Row */}
                                <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 dark:border-gray-900 pt-4">
                                  {note.file_type === "pdf" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="rounded-xl font-bold gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 transition-all active:scale-95 border-none"
                                        onClick={async () => {
                                          try {
                                            const file = await getFile(note.id);
                                            const url = file ? URL.createObjectURL(file) : note.file_url;
                                            setFullscreenNote({ ...note, file_url: url });

                                            // Record View
                                            const { error } = await supabase.from("note_views").upsert(
                                              { note_id: note.id, user_id: session?.user?.id || null },
                                              { onConflict: ['note_id', 'user_id'] }
                                            );

                                            if (!error) {
                                              setViewCounts(prev => ({ ...prev, [note.id]: (prev[note.id] || 0) + 1 }));
                                            }
                                          } catch (err) { console.error("View error:", err); }
                                        }}
                                      >
                                        <Eye className="h-4 w-4" /> View
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleDownload(note.id, note.file_url)}
                                        className="rounded-xl font-bold gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-all active:scale-95 border-none"
                                      >
                                        <DownloadCloud className="h-4 w-4" /> Cache
                                      </Button>
                                    </>
                                  )}

                                  {/* Delete Button (Owner Only) */}
                                  {session?.user?.id === note.uploaded_by && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-xl p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all ml-auto"
                                      onClick={async () => {
                                        if (!confirm("Delete this resource forever?")) return;
                                        try {
                                          const storagePath = note.file_url.split("/notes/")[1];
                                          if (storagePath) await supabase.storage.from("notes").remove([storagePath]);

                                          const { error: dbError } = await supabase.from("notes").delete().eq("id", note.id);
                                          if (dbError) throw dbError;

                                          setNotes(prev => prev.filter(n => n.id !== note.id));
                                        } catch (err) { alert("Failed to delete resource"); }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                {/* Social Stats Row */}
                                <div className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 group/stat">
                                      <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                                      </div>
                                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        {viewCounts[note.id] || 0}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => toggleLike(note.id)}
                                      className="flex items-center gap-1.5 group/like transition-transform active:scale-125"
                                    >
                                      <div className={`p-1.5 rounded-lg shadow-sm transition-colors ${bookmarkedItems.includes(note.id) ? 'bg-red-50 dark:bg-red-900/30' : 'bg-white dark:bg-gray-800'}`}>
                                        <Heart className={`h-3.5 w-3.5 ${bookmarkedItems.includes(note.id) ? "text-red-500 fill-current" : "text-gray-400"}`} />
                                      </div>
                                      <span className={`text-xs font-bold ${bookmarkedItems.includes(note.id) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {likeCounts[note.id] || 0}
                                      </span>
                                    </button>
                                  </div>

                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    Library
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                    <TermsButton />
                  </div>
                ))}
            </div>

          </Card>
        </div>


        {fullscreenNote && (
          <div
            ref={fullscreenRef}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="flex justify-end p-2">
              <Button
                onClick={() => setFullscreenNote(null)}
                variant="ghost"
                className="text-white"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            {fullscreenNote.file_type === 'pdf' ? (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">

                <Viewer
                  fileUrl={fullscreenNote.file_url}
                  plugins={[defaultLayoutPluginInstance]}
                  theme={isDarkMode ? "dark" : "light"}
                  renderLoader={() => <GlobalLoader message="Medrae is Downloading PDF..." />}
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

          </div>
        )}
      </div>
    </div>
  );
}
