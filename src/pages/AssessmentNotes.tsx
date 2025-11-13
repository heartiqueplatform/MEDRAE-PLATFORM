"use client";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed

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
  FileText, Video, Link, UploadCloud, Download, Eye, X, Search, Heart,
} from "lucide-react";
import { saveFile, getFile } from "@/lib/offlineStorage";


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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fullscreenNote, setFullscreenNote] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  // Upload progress & offline caching
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

// Download and save file for offline use
const handleDownload = async (fileId: string, url: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    await saveFile(fileId, blob);

    console.log(`File ${fileId} saved for offline use`);

    // Mark file as offline in UI
    setOfflineFiles((prev) => [...prev, fileId]);

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


  if (!confirm("Are you sure you want to delete this file?")) return;

  // Extract file path from URL (after /object/public/notes/)
  const urlParts = note.file_url.split("/object/public/notes/");
  const filePath = urlParts[1];

  if (!filePath) {
    console.error("File path not found:", note.file_url);
    return;
  }

  // Delete from storage
  const { error: storageErr } = await supabase.storage
    .from("notes")
    .remove([filePath]);

  if (storageErr) {
    console.error("Error deleting from storage:", storageErr);
    alert("Failed to delete file from storage");
    return;
  }

  // Delete from table
  const { error: dbErr } = await supabase
    .from("notes")
    .delete()
    .eq("id", note.id);

  if (dbErr) {
    console.error("Error deleting from database:", dbErr);
    alert("Failed to delete file record");
    return;
  }

  // Remove from local state
  setNotes((prev) => prev.filter((n) => n.id !== note.id));
  alert("File deleted successfully!");
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

    const ext = file.name.split(".").pop();
    const path = `assessment/${Date.now()}-${file.name}`;

   setUploading(true);
setUploadProgress(0);

// Simulate progress while uploading
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => {
    if (prev === null) return 0;
    if (prev >= 90) return prev;
    return prev + 10;
  });
}, 300);

const { error: uploadErr } = await supabase.storage.from("notes").upload(path, file);

clearInterval(progressInterval);
setUploadProgress(100);

if (uploadErr) {
  console.error("Storage error:", uploadErr);
  setUploading(false);
  setTimeout(() => setUploadProgress(null), 1000);
  return;
}

const { data: urlData } = supabase.storage.from("notes").getPublicUrl(path);
const file_url = urlData.publicUrl;
const payload = {
  uploaded_by: session.user.id,   // ✅ use correct column name
  title: formData.get("title"),
  description: formData.get("description"),
  course: formData.get("course"),
  institution: formData.get("institution"),
  unit: formData.get("unit"),
  category: formData.get("category"),
  sub_category: selectedSubcategory,
  block: selectedBlock,
  file_type: ext,
  file_url,
  is_public: true,
  approved: true,
};


    const { error: insertErr } = await supabase.from("notes").insert(payload);
    if (insertErr) console.error("Insert error:", insertErr);
    else {
   alert("Upload successful!");
setNotes((prev) => [{ id: Date.now(), ...payload }, ...prev]); // add new note to UI
setShowUploadForm(false);  // close upload form
setSelectedFile(null);     // reset file
setUploadProgress(null);   // reset progress

    }

    setUploading(false);
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

  return (
    <div className="space-y-6">
     <div className="flex flex-col">
  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-green-500 text-transparent bg-clip-text">
    Assessment Notes & Uploads
  </h1>
  <p className="text-muted-foreground mt-2">
  This page is dedicated to assessment guides, case study guides, and research
  resources. It brings together universal materials designed to support nursing
  education across all colleges and training institutions. Here, you’ll find
  practical guides, structured case studies, and project references curated to
  help students prepare effectively, build confidence, and excel both in
  classroom learning and clinical practice. And note, this does not give you the
  right to copy-paste it only provides a picture to show you what to expect.
</p>

  <p className="text-sm italic text-muted-foreground mt-1">
  Universal nursing assessment resources for all colleges
</p>

</div>


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
    {/* Progress bar */}
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      />
    </div>

    {/* Percentage + File size */}
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

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or description..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
  <Button variant="outline" onClick={() => setShowUploadForm(!showUploadForm)}>
          {showUploadForm ? "Cancel Upload" : "New Upload"}
        </Button>
      <Accordion type="multiple" className="space-y-6">
        {SECTIONS.map((section, i) => (
          <AccordionItem key={i} value={`section-${i}`}>
            <AccordionTrigger>{section.title}</AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue={section.subcategories[0]}>
               {/* Only for Practical Assessments & Case Studies */}
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
  // Keep original horizontal tabs for others
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
                       <div className="grid gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">

                          {subNotes.map((note) => (
                            <Card key={note.id} className="min-w-[300px] max-w-[300px]">
                              <CardHeader>
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(note.file_type)}
                                  <CardTitle className="text-sm">{note.title}</CardTitle>
                                  <Badge className={getTypeColor(note.file_type)}>
                                    {note.file_type.toUpperCase()}
                                  </Badge>
                                </div>
                                <CardDescription className="mt-1">{note.description}</CardDescription>
                                <p className="text-xs text-muted-foreground">
                                  {note.course && <span>{note.course} · </span>}
                                  {new Date(note.created_at).toLocaleDateString()}
                                </p>
                              </CardHeader>
                            <CardContent>
  <Button
    size="sm"
    className="w-full flex gap-1 justify-center"
    variant="secondary"
    onClick={async () => {
      setFullscreenNote(note);
      if (session?.user?.id) {
        const { error } = await supabase.from("note_views").insert({
          note_id: note.id,
          user_id: session.user.id,
        });
        if (!error) {
          setViewCounts((prev) => ({
            ...prev,
            [note.id]: (prev[note.id] || 0) + 1,
          }));
        }
      }
    }}
  >
    <Eye className="h-4 w-4" />
    View Document
  </Button>

  {/* Offline download button */}
<div className="flex gap-2 mt-2">
  <Button
    size="sm"
    onClick={async () => {
      await handleDownload(note.id, note.file_url);
    }}
    className="flex items-center gap-1 w-full justify-center"
  >
    <Download className="h-3 w-3" />
    Cache
  </Button>
  {/* Delete button for uploader only */}
{session?.user?.id === note.uploaded_by && (
  <Button
    size="sm"
    variant="destructive"
    onClick={() => handleDelete(note)}
    className="flex items-center gap-1 w-full justify-center"
  >
    Delete
  </Button>
)}


  {/* Show badge if file is saved offline */}
  {offlineFiles.includes(note.id) && (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
      Preserved
    </Badge>
  )}
</div>

  <div className="flex justify-between mt-2 text-xs text-muted-foreground items-center">
    <div className="flex items-center gap-1">
      <Eye className="h-3 w-3" />
      {viewCounts[note.id] || 0}
    </div>
    <button
      className={`flex items-center gap-1 ${
        bookmarkedItems.includes(note.id) ? "text-red-500" : ""
      }`}
      onClick={() => toggleLike(note.id)}
    >
      <Heart
        className={`h-4 w-4 ${
          bookmarkedItems.includes(note.id) ? "fill-current" : ""
        }`}
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
    {/* Close button */}
    <div className="flex justify-end p-2">
      <Button
        onClick={() => setFullscreenNote(null)}
        variant="ghost"
        className="text-current hover:bg-muted/20"
      >
        <X className="h-6 w-6" />
      </Button>
    </div>

    {/* PDF viewer or iframe */}
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
  );
}
