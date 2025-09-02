"use client";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
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
  Video,
  Link,
  Heart,
  Search,
  Download,
  Eye,
  X,
} from "lucide-react";
import { saveFile, getFile } from "@/lib/offlineStorage";

export function Resources() {
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    block: "PTS",
    course: "",
    fileType: "pdf",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [floatingBlockOpen, setFloatingBlockOpen] = useState(false);
const [selectedBlock, setSelectedBlock] = useState("PTS");
const [offlineFiles, setOfflineFiles] = useState<string[]>([]);
const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);

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
const [loadingNotes, setLoadingNotes] = useState(true);

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
    setLoadingNotes(true); // start spinner

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("is_public", true)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching notes:", error);
    else setNotes(data || []);

    setLoadingNotes(false); // stop spinner
  };
  fetchNotes();
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
  // ✅ Realtime subscription for likes & views
useEffect(() => {
    const likeChannel = supabase
    .channel("likes-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "note_likes" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          // update like counts
          setLikeCounts((prev) => ({
            ...prev,
            [payload.new.note_id]: (prev[payload.new.note_id] || 0) + 1,
          }));

          // if it's THIS USER → update bookmarkedItems too
          if (payload.new.user_id === session?.user?.id) {
            setBookmarkedItems((prev) => [...prev, payload.new.note_id]);
          }
        }

        if (payload.eventType === "DELETE") {
          // update like counts
          setLikeCounts((prev) => ({
            ...prev,
            [payload.old.note_id]: Math.max(
              (prev[payload.old.note_id] || 1) - 1,
              0
            ),
          }));

          // if it's THIS USER → remove from bookmarkedItems
          if (payload.old.user_id === session?.user?.id) {
            setBookmarkedItems((prev) =>
              prev.filter((id) => id !== payload.old.note_id)
            );
          }
        }
      }
    )
    .subscribe();

  const viewChannel = supabase
    .channel("views-changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "note_views" },
      (payload) => {
        setViewCounts((prev) => ({
          ...prev,
          [payload.new.note_id]: (prev[payload.new.note_id] || 0) + 1,
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(likeChannel);
    supabase.removeChannel(viewChannel);
  };
}, []);


  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenNote(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const filteredResources = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

    // ✅ Like toggle function with optimistic UI
  const toggleLike = async (noteId: string) => {
    if (!session?.user?.id) return alert("Login required");

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
// Fake progress simulation
setUploadProgress(0);
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => {
    if (prev === null) return 0;
    if (prev >= 90) return prev; // stop at 90% until upload finishes
    return prev + 10;
  });
}, 300);

const { error: storageError } = await supabase.storage
  .from("notes")
  .upload(filePath, file);

clearInterval(progressInterval);
setUploadProgress(100);


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
    setUploading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
            Notes & Resources
          </h1>
          <p className="text-muted-foreground mt-2">
            Access study materials, references, and upload your own
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? "Cancel Upload" : "New Upload"}
        </Button>
      </div>

      {showUploadForm && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/10">
          <h2 className="text-xl font-semibold">Upload New Resource</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Title"
              value={uploadForm.title}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, title: e.target.value })
              }
            />
            <Input
              placeholder="Course (optional)"
              value={uploadForm.course}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, course: e.target.value })
              }
            />
            <Input
              placeholder="Short description"
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, description: e.target.value })
              }
            />
            <select
              value={uploadForm.block}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, block: e.target.value })
              }
              className="border rounded px-3 py-2 text-sm bg-gray-100 text-black"
            >
              {blockCategories.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={uploadForm.fileType}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, fileType: e.target.value })
              }
              className="border rounded px-3 py-2 text-sm bg-gray-100 text-black"
            >
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="link">Link</option>
            </select>
            <Input
              type="file"
              accept=".pdf,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={uploadResource} disabled={uploading}>
            {uploading ? "Uploading..." : "Submit Resource"}
          </Button>
          {uploadProgress !== null && (
  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${uploadProgress}%` }}
    />
  </div>
)}

        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
{/* Static Block Selector Below Search */}
<div className="relative mt-4">
  <Button
    onClick={() => setFloatingBlockOpen(!floatingBlockOpen)}
  className="bg-blue-500 text-white dark:bg-blue-600 dark:text-white hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"

  >
    Choose Block OR Semester here
  </Button>

  {floatingBlockOpen && (
    <div className="mt-2 bg-white dark:bg-gray-800 shadow-md rounded-lg w-48">
      {blockCategories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => {
            setSelectedBlock(cat.id);
            setFloatingBlockOpen(false);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-700 ${
            selectedBlock === cat.id ? "font-bold" : ""
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )}
</div>

{/* Tabs content controlled by selectedBlock */}
<div className="space-y-4 mt-2">
  {blockCategories
    .filter((cat) => cat.id === selectedBlock)
    .map((cat) => (
      <div key={cat.id}>
        <div className="grid gap-4">
          {loadingNotes ? (
            <div className="flex flex-col items-center justify-center py-20 col-span-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-muted-foreground text-center">
                Please be patient, Heartique is preparing your notes...
              </p>
            </div>
          ) : filteredResources.filter((note) =>
              cat.id === "OTHER"
                ? !blockCategories
                    .slice(0, 7)
                    .some((b) => (note.block || "").toUpperCase() === b.id)
                : (note.block || "").toUpperCase() === cat.id
            ).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 col-span-full">
              <p className="text-muted-foreground text-center">
                No notes available for this category yet. Check back soon for updates!
              </p>
            </div>
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
                <Card key={note.id} className="transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(note.file_type)}
                          <CardTitle className="text-lg">{note.title}</CardTitle>
                          <Badge className={getTypeColor(note.file_type)}>
                            {note.file_type.toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription>{note.description}</CardDescription>
                        <div className="text-sm text-muted-foreground">
                          {note.course && <span>{note.course}</span>}
                          <span>
                            {" "}
                            · Uploaded {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(note.id)}
                        className={bookmarkedItems.includes(note.id) ? "text-red-500" : ""}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            bookmarkedItems.includes(note.id) ? "fill-current" : ""
                          }`}
                        />
                        <span className="ml-1 text-xs">{likeCounts[note.id] || 0}</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    
                   {note.file_type === "pdf" && (
  <div className="flex gap-2">
   <Button
  size="sm"
  variant="secondary"
  className="flex gap-1 items-center"
  onClick={async () => {
    try {
      // 1️⃣ Try offline first
      const file = await getFile(note.id);
      if (file) {
        const url = URL.createObjectURL(file);
        setFullscreenNote({ ...note, file_url: url });
      } else {
        setFullscreenNote(note);
      }

      // 2️⃣ Record view in Supabase
      const { error } = await supabase
        .from("note_views")
        .insert({
          note_id: note.id,
          user_id: session?.user?.id || null, // allow anonymous views
        });

      if (error) {
        console.error("Error recording view:", error);
      } else {
        // 3️⃣ Update UI immediately
        setViewCounts((prev) => ({
          ...prev,
          [note.id]: (prev[note.id] || 0) + 1,
        }));
      }
    } catch (err) {
      console.error("Unexpected error recording view:", err);
    }
  }}
>
  <Eye className="h-4 w-4" /> Fullscreen View
</Button>


  <Button
  size="sm"
  onClick={async () => {
    await handleDownload(note.id, note.file_url);
  }}
  className="flex items-center gap-1"
>
  <Download className="h-3 w-3" />
  Cache
</Button>
{/* ✅ Show badge if file is saved offline */}
{offlineFiles.includes(note.id) && (
  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
    Preserved
  </Badge>
)}


  </div>
)}

                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{viewCounts[note.id] || 0} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </div>
    ))}
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
        theme={isDarkMode ? "dark" : "light"} // Tailwind-aware
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
  );
}
