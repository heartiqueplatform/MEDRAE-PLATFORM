"use client";
import { GlobalLoader } from "@/components/GlobalLoader"; // adjust path if needed

import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import "../styles/pdfOverrides.css";

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
  Trash2,
  Link,
  Heart,
  Search,
  Download,
  Eye,
  X,
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

      // ✅ Try loading from localStorage first
      const cachedLikes = localStorage.getItem("likeCounts");
      const cachedViews = localStorage.getItem("viewCounts");
      const cachedUserLikes = localStorage.getItem("bookmarkedItems");

      if (cachedLikes && cachedViews && cachedUserLikes) {
        setLikeCounts(JSON.parse(cachedLikes));
        setViewCounts(JSON.parse(cachedViews));
        setBookmarkedItems(JSON.parse(cachedUserLikes));
        return;
      }

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

      // ✅ Save to localStorage
      localStorage.setItem("likeCounts", JSON.stringify(likesMap));
      localStorage.setItem("viewCounts", JSON.stringify(viewsMap));
      localStorage.setItem("bookmarkedItems", JSON.stringify(userLiked));
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
            setLikeCounts((prev) => {
              const updated = {
                ...prev,
                [payload.new.note_id]: (prev[payload.new.note_id] || 0) + 1,
              };
              localStorage.setItem("likeCounts", JSON.stringify(updated)); // ✅ update cache
              return updated;
            });

            if (payload.new.user_id === session?.user?.id) {
              setBookmarkedItems((prev) => {
                const updated = [...prev, payload.new.note_id];
                localStorage.setItem("bookmarkedItems", JSON.stringify(updated)); // ✅ update cache
                return updated;
              });
            }
          }

          if (payload.eventType === "DELETE") {
            setLikeCounts((prev) => {
              const updated = {
                ...prev,
                [payload.old.note_id]: Math.max(
                  (prev[payload.old.note_id] || 1) - 1,
                  0
                ),
              };
              localStorage.setItem("likeCounts", JSON.stringify(updated)); // ✅ update cache
              return updated;
            });

            if (payload.old.user_id === session?.user?.id) {
              setBookmarkedItems((prev) => {
                const updated = prev.filter((id) => id !== payload.old.note_id);
                localStorage.setItem("bookmarkedItems", JSON.stringify(updated)); // ✅ update cache
                return updated;
              });
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
          setViewCounts((prev) => {
            const updated = {
              ...prev,
              [payload.new.note_id]: (prev[payload.new.note_id] || 0) + 1,
            };
            localStorage.setItem("viewCounts", JSON.stringify(updated)); // ✅ update cache
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likeChannel);
      supabase.removeChannel(viewChannel);
    };
  }, [session?.user?.id]);



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
    <div className="space-y-10 w-full px-2 sm:px-4">


      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">
            Notes & Resources
          </h1>
          <p className="text-muted-foreground mt-2">
            This page provides access to a wide range of study materials and references.
            While some notes may appear mixed across blocks and semesters, they are
            organized to align closely with the curriculum used in most Kenyan KMTC and
            private institutions. This ensures you’ll find diverse, high-quality content
            to support your learning, research, and personal note uploads.
          </p>
          <p className="text-sm text-muted-foreground italic mt-1">
            Well-organized notes aligned with KMTC and private institution curricula
          </p>

        </div>

      </div>


      {showUploadForm && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/10 px-2 sm:px-4">

          <h2 className="text-xl font-semibold">Upload New Resource</h2>
          <div className="grid gap-4 md:grid-cols-2 px-0">

            <Input
              placeholder="Course (optional)"
              value={uploadForm.course}
              onChange={(e) => {
                const value = e.target.value;
                setUploadForm({ ...uploadForm, course: value });
                localStorage.setItem("selectedCourse", value); // ✅ remember optional course
              }}
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
              accept=".pdf"
              multiple
              onChange={(e) => {
                if (!e.target.files) return;
                const selected = Array.from(e.target.files);
                setFiles(selected); // ✅ keep in state
                uploadBatchResources(e.target.files); // ✅ start upload
              }}
            />


          </div>
          {uploading ? (
            <div className="flex gap-2">
              <Button disabled>
                Uploading...
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  uploadAbortController.current?.abort(); // stop Supabase upload
                  setUploading(false);
                  setUploadProgress(null);
                  setFile(null); // ✅ clear file input
                  setUploadForm({
                    title: "",
                    description: "",
                    block: "PTS",
                    course: localStorage.getItem("selectedCourse") || "",
                    fileType: "pdf",
                  }); // ✅ reset form
                  alert("Upload canceled!");
                }}
              >
                Cancel Upload
              </Button>

            </div>
          ) : (
            <Button onClick={uploadResource}>
              Submit Resource
            </Button>
          )}
          {uploadProgress !== null && (
            <div className="w-full mt-2 space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {(() => {
                  const totalSize = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024); // MB
                  const uploaded = (uploadProgress / 100) * totalSize;
                  return `${uploaded.toFixed(2)} MB / ${totalSize.toFixed(2)} MB (${uploadProgress.toFixed(0)}%)`;
                })()}
              </div>
            </div>
          )}


        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 px-2 sm:px-0">

          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />

        </div>

        <Button
          variant="outline"
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="whitespace-nowrap"
        >
          {showUploadForm ? "Cancel Upload" : "New Upload"}
        </Button>
      </div>



      {/* Static Block Selector Below Search */}
      <div className="relative mt-4 w-full flex justify-center px-2 sm:px-0">


        {/* ✅ Screen Overlay */}
        {floatingBlockOpen && (
          <div
            className="
        fixed inset-0 z-40
        bg-black/70
        transition-opacity
      "
            onClick={() => setFloatingBlockOpen(false)}
          />
        )}

        {/* Button */}
        <Button
          onClick={() => setFloatingBlockOpen(!floatingBlockOpen)}
          className="
  relative z-40
  bg-gray-100 text-gray-900
  dark:bg-gray-800 dark:text-gray-100
  hover:bg-gray-200 dark:hover:bg-gray-700
  transition-colors
  w-full sm:w-auto
"
        >

          Choose Block OR Semester here
        </Button>

        {/* Floating Animated Dropdown */}
        {floatingBlockOpen && (
          <div
            className="
  absolute top-full mt-2 z-40
  left-0 right-0 sm:w-56
  bg-white dark:bg-gray-800
  shadow-xl rounded-lg
  origin-top
  animate-in slide-in-from-top-2 fade-in
  duration-200
  mx-2 sm:mx-0
"
          >

            {blockCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedBlock(cat.id);
                  setFloatingBlockOpen(false);
                }}
                className={`
            w-full text-left px-4 py-2 text-sm
            hover:bg-blue-100 dark:hover:bg-blue-700
            transition-colors
            ${selectedBlock === cat.id ? "font-bold" : ""}
          `}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Tabs content controlled by selectedBlock */}
      <div className="space-y-4 mt-2 px-2 sm:px-0">

        {/* Dynamic Heading for Selected Block */}
        <h2 className="text-2xl font-bold mb-4">
          {blockCategories.find((cat) => cat.id === selectedBlock)?.name.split("/").pop()}
        </h2>

        {blockCategories
          .filter((cat) => cat.id === selectedBlock)
          .map((cat) => (
            <div key={cat.id}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full">
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
                      <Card
                        key={note.id}
                        className="transition-all hover:shadow-lg hover:scale-105 duration-300 overflow-hidden break-words w-full sm:w-auto px-2 sm:px-4"
                      >

                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-2 px-2 sm:px-0">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {getTypeIcon(note.file_type)}
                                <CardTitle className="text-lg">{note.title}</CardTitle>
                                <Badge className={getTypeColor(note.file_type)}>
                                  {note.file_type.toUpperCase()}
                                </Badge>
                              </div>
                              <CardDescription>{note.description}</CardDescription>
                              <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                                {note.course && <span>{note.course}</span>}
                                <span>· Uploaded {new Date(note.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {session?.user?.id === note.uploaded_by && (
                              <Button

                                size="sm"
                                variant="ghost"
                                className="mt-3 p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"

                                onClick={async () => {
                                  if (!confirm("Are you sure you want to delete this note?")) return;

                                  try {
                                    const url = note.file_url;
                                    const parts = url.split("/notes/");
                                    const storagePath = parts[1];

                                    if (storagePath) {
                                      const { error: storageError } = await supabase.storage
                                        .from("notes")
                                        .remove([storagePath]);
                                      if (storageError) console.error("Storage deletion error:", storageError);
                                    }

                                    const { error: dbError } = await supabase
                                      .from("notes")
                                      .delete()
                                      .eq("id", note.id);
                                    if (dbError) {
                                      console.error("DB deletion error:", dbError);
                                      alert("Failed to delete note");
                                      return;
                                    }

                                    setNotes((prev) => prev.filter((n) => n.id !== note.id));
                                    alert("Note deleted successfully!");
                                  } catch (err) {
                                    console.error("Unexpected deletion error:", err);
                                    alert("Something went wrong while deleting the note");
                                  }
                                }}
                              >
                                {/* ✅ Updated trash icon */}
                                <Trash2 className="h-4 w-4 mr-1" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-2 px-2 sm:px-0">
                          {note.file_type === "pdf" && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mt-3 p-2 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"

                                onClick={async () => {
                                  try {
                                    const file = await getFile(note.id);
                                    if (file) {
                                      const url = URL.createObjectURL(file);
                                      setFullscreenNote({ ...note, file_url: url });
                                    } else {
                                      setFullscreenNote(note);
                                    }

                                    const { error } = await supabase
                                      .from("note_views")
                                      .upsert(
                                        { note_id: note.id, user_id: session?.user?.id || null },
                                        { onConflict: ['note_id', 'user_id'] }
                                      );

                                    if (error) console.error("Error recording view:", error);
                                    else
                                      setViewCounts((prev) => ({
                                        ...prev,
                                        [note.id]: (prev[note.id] || 0) + 1,
                                      }));

                                    if (!error) {
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
                                <Eye className="h-4 w-4" />View
                              </Button>

                              <Button
                                size="sm"
                                onClick={async () => await handleDownload(note.id, note.file_url)}
                                variant="ghost"
                                className="mt-3 p-2 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {/* ✅ Updated download icon */}
                                <Download className="h-3 w-3" /> Cache
                              </Button>

                              {offlineFiles.includes(note.id) && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 w-full sm:w-auto">
                                  Preserved
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="text-sm text-muted-foreground flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{viewCounts[note.id] || 0}</span>
                            </div>

                            <button
                              onClick={() => toggleLike(note.id)}
                              className={`flex items-center gap-1 ${bookmarkedItems.includes(note.id) ? "text-red-500" : "text-muted-foreground"
                                }`}
                            >
                              <Heart className={`h-3 w-3 ${bookmarkedItems.includes(note.id) ? "fill-current" : ""}`} />
                              <span>{likeCounts[note.id] || 0}</span>
                            </button>
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
  );
}
