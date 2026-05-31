"use client";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
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
  FileText, Video, Link, UploadCloud, Download, Eye, X, Search, Heart, Trash2, Sparkles, Lock, CheckCircle2
} from "lucide-react";
import { saveFile, getFile } from "@/lib/offlineStorage";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

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

export default function AssessmentNotes() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();

  // State for premium upgrade overlay
  const [showPremiumOverlay, setShowPremiumOverlay] = useState(false);
  const [selectedNoteForOverlay, setSelectedNoteForOverlay] = useState<any>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fullscreenNote, setFullscreenNote] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [offlineFiles, setOfflineFiles] = useState<string[]>([]);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");

  const [session, setSession] = useState<any>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Load offline file or fallback to online
  const loadOfflineFile = async (fileId: string, fileUrl: string) => {
    const file = await getFile(fileId);
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
      return;
    }
    window.open(fileUrl, "_blank");
  };

  // Handle view with premium check
  const handleViewNote = async (note: any) => {
    // 🔒 If not premium, show upgrade overlay
    if (!isPremium) {
      setSelectedNoteForOverlay(note);
      setShowPremiumOverlay(true);
      return;
    }

    // ✅ Premium user - open normally
    setFullscreenNote(note);
    if (session?.user?.id) {
      const { error } = await supabase
        .from("note_views")
        .upsert(
          { note_id: note.id, user_id: session.user.id },
          { onConflict: ["note_id", "user_id"] }
        );

      if (!error) {
        setViewCounts((prev) => ({
          ...prev,
          [note.id]: (prev[note.id] || 0) + 1,
        }));
      }
    }
  };

  // Handle download with premium check
  const handleDownloadNote = async (noteId: string, url: string) => {
    // 🔒 If not premium, show upgrade overlay
    if (!isPremium) {
      const note = notes.find(n => n.id === noteId);
      setSelectedNoteForOverlay(note);
      setShowPremiumOverlay(true);
      return;
    }

    // ✅ Premium user - download normally
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await saveFile(noteId, blob);
      console.log(`File ${noteId} saved for offline use`);
      setOfflineFiles((prev) => [...prev, noteId]);
      alert("Saved offline!");
    } catch (err) {
      console.error("Failed to save offline:", err);
    }
  };

  // Delete file from Supabase storage + database
  const handleDelete = async (note: any) => {
    if (!session?.user?.id) return alert("Login required");

    if (note.uploaded_by !== session.user.id) {
      return alert("You can only delete your own uploads");
    }

    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error: dbErr } = await supabase
        .from("notes")
        .delete()
        .eq("id", note.id);

      if (dbErr) throw dbErr;

      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      alert("Record removed successfully!");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete record.");
    }
  };

  useEffect(() => {
    if (fullscreenNote?.file_type === "pdf") setPdfLoading(true);
  }, [fullscreenNote]);

  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("is_public", true)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching notes:", error);
      else setNotes(data || []);
    };

    fetchNotes();
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
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

  const toggleLike = async (noteId: string) => {
    if (!session?.user?.id) return alert("Login required");

    const alreadyLiked = bookmarkedItems.includes(noteId);

    if (alreadyLiked) {
      await supabase
        .from("note_likes")
        .delete()
        .match({ note_id: noteId, user_id: session.user.id });

      setBookmarkedItems((prev) => prev.filter((id) => id !== noteId));
      setLikeCounts((prev) => ({ ...prev, [noteId]: (prev[noteId] || 1) - 1 }));
    } else {
      await supabase.from("note_likes").insert({
        note_id: noteId,
        user_id: session.user.id,
      });

      setBookmarkedItems((prev) => [...prev, noteId]);
      setLikeCounts((prev) => ({ ...prev, [noteId]: (prev[noteId] || 0) + 1 }));
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
        {
          method: "POST",
          body: cloudinaryFormData,
        }
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
      setNotes((prev) => [dbData, ...prev]);
      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadProgress(null);

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
      (note.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show subscription loading
  if (subscriptionLoading) {
    return <GlobalLoader message="Verifying subscription..." />;
  }

  return (
    <>
      <div className="min-h-screen w-full flex justify-center bg-[var(--card-bg)] dark:bg-[var(--card-bg-dark)] ">
        <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6">
          <Card className="shadow-md hover:shadow-lg transition-all rounded-2xl border-0 mt-0">
            <CardHeader>
              <CardTitle className="text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text">
                Assessment Notes & Uploads
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div>
                <p className="text-muted-foreground text-base leading-relaxed mt-0">
                  This page is dedicated to assessment guides, case study guides, and research resources.
                  It brings together universal materials designed to support nursing education across all colleges and training institutions
                  <span
                    className="text-primary font-semibold cursor-pointer ml-1 hover:underline"
                    onClick={() => setShowDescription(!showDescription)}
                  >
                    ... Learn more
                  </span>
                </p>

                <AnimatePresence initial={false}>
                  {showDescription && (
                    <motion.div
                      key="assessment-description-expanded"
                      className="mt-2 text-muted-foreground text-base leading-relaxed space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    >
                      <p>
                        Here, you'll find practical guides, structured case studies, and project references curated to
                        help students prepare effectively, build confidence, and excel both in classroom learning and clinical practice.
                        And note, this does not give you the right to copy-paste it; it only provides a picture to show you what to expect.
                      </p>
                      <p className="text-sm italic">
                        Universal nursing assessment resources for all colleges
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or description..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {showUploadForm && (
            <form onSubmit={handleUpload} className="border p-4 rounded space-y-4 bg-muted/20">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="title" placeholder="Title *" required />
                <Input name="description" placeholder="Short Description" />
                <Input name="course" placeholder="Course *" required />
                <Input name="institution" placeholder="Institution *" required />
                <Input name="unit" placeholder="Unit *" required />
                <Input name="category" placeholder="Category *" required />
                <select
                  className="border rounded px-3 py-2 text-sm bg-white text-black dark:bg-gray-800 dark:text-white"
                  value={selectedBlock}
                  onChange={(e) => {
                    setSelectedBlock(e.target.value);
                    setSelectedSubcategory("");
                  }}
                  required
                >
                  <option value="">Select Block *</option>
                  {SECTIONS.map((s) => (
                    <option key={s.title} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <select
                  className="border rounded px-3 py-2 text-sm bg-white text-black dark:bg-gray-800 dark:text-white"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  required
                  disabled={!selectedBlock}
                >
                  <option value="">Select Subcategory *</option>
                  {SECTIONS.find((s) => s.title === selectedBlock)?.subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <Input
                  type="file"
                  name="file"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                />
              </div>
              {uploadProgress !== null && selectedFile && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
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
              <Button type="submit" disabled={uploading}>
                <UploadCloud className="w-4 h-4 mr-1" />
                {uploading ? "Uploading..." : "Upload Note"}
              </Button>
            </form>
          )}

          <Button variant="outline" onClick={() => setShowUploadForm(!showUploadForm)}>
            {showUploadForm ? "Cancel Upload" : "New Upload"}
          </Button>

          <Accordion type="multiple" className="space-y-6">
            {SECTIONS.map((section, i) => (
              <AccordionItem key={i} value={`section-${i}`}>
                <AccordionTrigger>{section.title}</AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue={section.subcategories[0]}>
                    {["Practical Assessments", "Case Studies"].includes(section.title) ? (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            setSelectedSubcategory((prev) =>
                              prev && section.subcategories.includes(prev) ? "" : section.subcategories[0]
                            )
                          }
                        >
                          {selectedSubcategory || "Select Subcategory"}
                        </Button>
                        {selectedSubcategory === section.subcategories[0] && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {section.subcategories.map((sub) => (
                              <Button
                                key={sub}
                                size="sm"
                                variant="ghost"
                                className="justify-start"
                                onClick={() => setSelectedSubcategory(sub)}
                              >
                                {sub}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <TabsList className="flex flex-wrap gap-2 w-full">
                        {section.subcategories.map((sub) => (
                          <TabsTrigger key={sub} value={sub} className="text-sm whitespace-nowrap">
                            {sub}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    )}

                    {section.subcategories.map((sub) => {
                      const subNotes = filteredNotes.filter(
                        (n) => n.sub_category === sub && n.block === section.title
                      );

                      return (
                        <TabsContent key={sub} value={sub} className="space-y-4 mt-4">
                          {subNotes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No notes yet in this subcategory.</p>
                          ) : (
                            <div className="grid gap-1 pb-2 sm:grid-cols-2 lg:grid-cols-2">
                              {subNotes.map((note) => (
                                <Card
                                  key={note.id}
                                  className="flex flex-col border-0 justify-between transition-all hover:shadow-lg duration-300 overflow-hidden break-words w-full sm:w-auto px-2 sm:px-4"
                                >
                                  <CardHeader className="px-2 sm:px-0">
                                    <div className="flex flex-col items-start gap-1">
                                      <div className="flex items-center gap-1">
                                        {getTypeIcon(note.file_type)}
                                        <CardTitle className="text-sm text-left">{note.title}</CardTitle>
                                        <Badge className={getTypeColor(note.file_type)}>
                                          {note.file_type.toUpperCase()}
                                        </Badge>
                                        {!isPremium && (
                                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 ml-1">
                                            <Lock className="h-3 w-3 mr-0.5" /> PREMIUM
                                          </Badge>
                                        )}
                                      </div>
                                      <CardDescription className="mt-1 text-sm text-left">
                                        {note.description}
                                      </CardDescription>
                                      <p className="text-xs text-muted-foreground text-left">
                                        {note.course && <span>{note.course} · </span>}
                                        {new Date(note.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </CardHeader>

                                  <CardContent>
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleDownloadNote(note.id, note.file_url)}
                                        variant="ghost"
                                        className="mt-3 p-2 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {!isPremium && <Lock className="h-3 w-3 mr-1" />}
                                        <Download className="h-4 w-4" />
                                        Cache
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-3 p-2 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={() => handleViewNote(note)}
                                      >
                                        {!isPremium && <Lock className="h-3 w-3 mr-1" />}
                                        <Eye className="h-4 w-4" />
                                        View
                                      </Button>

                                      {session?.user?.id === note.uploaded_by && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleDelete(note)}
                                          variant="ghost"
                                          className="mt-3 p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}

                                      {offlineFiles.includes(note.id) && (
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          Preserved
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex justify-between mt-2 text-xs text-muted-foreground items-center">
                                      <div className="flex items-center gap-1">
                                        <Eye className="h-6 w-6" />
                                        {viewCounts[note.id] || 0}
                                      </div>
                                      <button
                                        className={`flex items-center gap-1 ${bookmarkedItems.includes(note.id) ? "text-red-500" : ""}`}
                                        onClick={() => toggleLike(note.id)}
                                      >
                                        <Heart
                                          className={`h-6 w-6 ${bookmarkedItems.includes(note.id) ? "fill-current" : ""}`}
                                        />
                                        <span>{likeCounts[note.id] || 0}</span>
                                      </button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {fullscreenNote && (
            <div
              ref={fullscreenRef}
              className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
            >
              <div className="flex justify-end p-2">
                <Button
                  onClick={() => setFullscreenNote(null)}
                  variant="ghost"
                  className="text-current hover:bg-muted/20"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              {fullscreenNote.file_type === "pdf" ? (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <Viewer
                    fileUrl={fullscreenNote.file_url}
                    plugins={[defaultLayoutPluginInstance]}
                    theme={isDarkMode ? "dark" : "light"}
                    renderLoader={() => (
                      <div className="flex items-center justify-center w-full h-full bg-background text-foreground">
                        <GlobalLoader message="Medrae is Loading PDF..." />
                      </div>
                    )}
                  />
                </Worker>
              ) : (
                <iframe
                  src={fullscreenNote.file_url}
                  className="flex-1 w-full bg-background text-foreground"
                  style={{ border: "none" }}
                  title={fullscreenNote.title}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* PREMIUM UPGRADE OVERLAY - Shows when non-premium user tries to view/download */}
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
              <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8 text-center">
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setShowPremiumOverlay(false)} className="text-white/80 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Lock className="w-12 h-12 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  Premium Resource
                </h3>
                <p className="text-white/90 text-sm">
                  {selectedNoteForOverlay?.title}
                </p>
              </div>

              <div className="p-8">
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Full access to all {notes.length}+ assessment notes</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Download for offline study</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Case studies & practical guides</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Research project templates</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowPremiumOverlay(false);
                    navigate("/subscription");
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group mb-3"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Unlock All Features — KES 299 for 3 Months</span>
                </button>

                <button
                  onClick={() => setShowPremiumOverlay(false)}
                  className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}