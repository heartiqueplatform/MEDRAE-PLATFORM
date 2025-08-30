"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [session, setSession] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fullscreenNote, setFullscreenNote] = useState<any>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

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
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    fetchSession();
  }, []);

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
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const uploadResource = async () => {
    if (!file || !session?.user) return alert("Missing file or user.");
    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("notes")
      .upload(filePath, file);

    if (storageError) {
      console.error("Storage error", storageError);
      setUploading(false);
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

      <Tabs defaultValue="PTS" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">

          {blockCategories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {blockCategories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id}>
            <div className="grid gap-4">
              {filteredResources
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
                            <CardTitle className="text-lg">
                              {note.title}
                            </CardTitle>
                            <Badge className={getTypeColor(note.file_type)}>
                              {note.file_type.toUpperCase()}
                            </Badge>
                          </div>
                          <CardDescription>{note.description}</CardDescription>
                          <div className="text-sm text-muted-foreground">
                            {note.course && <span>{note.course}</span>}
                            <span>
                              {" "}
                              · Uploaded{" "}
                              {new Date(
                                note.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike(note.id)}
                          className={
                            bookmarkedItems.includes(note.id)
                              ? "text-red-500"
                              : ""
                          }
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              bookmarkedItems.includes(note.id)
                                ? "fill-current"
                                : ""
                            }`}
                          />
                          <span className="ml-1 text-xs">
                            {likeCounts[note.id] || 0}
                          </span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {note.file_type === "pdf" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex gap-1 items-center"
                          onClick={async () => {
                            setFullscreenNote(note);
                            if (session?.user?.id) {
                              const { error } = await supabase
                                .from("note_views")
                                .insert({
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
                          <Eye className="h-4 w-4" /> Fullscreen View
                        </Button>
                      )}
                      {note.file_type !== "pdf" && (
                        <Button size="sm" asChild>
                          <a
                            href={note.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Open {note.file_type}
                          </a>
                        </Button>
                      )}
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{viewCounts[note.id] || 0} views</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

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
          <iframe
            src={fullscreenNote.file_url}
            className="flex-1 w-full"
            style={{ border: "none" }}
            title={fullscreenNote.title}
          />
        </div>
      )}
    </div>
  );
}
