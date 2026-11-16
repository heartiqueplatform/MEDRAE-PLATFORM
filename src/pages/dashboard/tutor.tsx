// pages/TutorDashboard.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import {
  TutorHeader,
  TutorStatsRow,
  TutorDashboardSkeleton,
  ClassList,
  CreateClassSheet,
  SendAnnouncementSheet,
  AddStudentsCard,
  CohortStudentList,
  ConnectCards,
  type ClassRowData,
  type CohortStudent,
  type LinkedStudent,
} from "@/components/tutor";

import CohortAnnouncement from "@/components/tutor/CohortAnnouncement";
import DailyStatus from "@/components/DailyStatus";
import { TermsButton } from "@/components/ui/TermsButton";
import TutorQuickAction from "@/components/exams/TutorQuickAction";
import { TutorShare } from "@/components/exams/TutorShare";
import { UserProfileModal } from "@/components/UserProfileModal";

import { fetchWithDedupe, lsGet, lsSet, cacheInvalidate } from "@/lib/tutor/cache";
import { tap } from "@/lib/tutor/tap";

// ---------------------------------------------------------------
// Types (server shapes)
// ---------------------------------------------------------------
interface RawLinkedRow {
  id: string;
  student_id: string;
  block: string;
  year: number;
  semester: number;
  profiles:
  | { name: string | null; username: string | null; avatar_url: string | null }
  | { name: string | null; username: string | null; avatar_url: string | null }[]
  | null;
}

interface TutorClass {
  id: string;
  tutor_id: string;
  block: string;
  year: number;
  semester: number;
  class_name: string | null;
  is_active: boolean;
  student_count?: number;
}

interface ProfileLite {
  name: string | null;
  institution: string | null;
}

const PROFILE_TTL = 5 * 60 * 1000;

// ===============================================================
// PAGE
// ===============================================================
export default function TutorDashboard() {
  const user = useUser();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [classes, setClasses] = useState<ClassRowData[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [linked, setLinked] = useState<LinkedStudent[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(true);

  // 1. add state
  const [composeOpen, setComposeOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRowData | null>(null);
  const [announceClass, setAnnounceClass] = useState<ClassRowData | null>(null);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // ---------------------------------------------------------------
  // PROFILE + STREAK
  // ---------------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!userId) return;
    const cacheKey = `profile:${userId}`;
    const cached = lsGet<ProfileLite>(cacheKey, PROFILE_TTL);
    if (cached) setProfile(cached);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, institution")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      const p = { name: data?.name ?? null, institution: data?.institution ?? null };
      setProfile(p);
      lsSet(cacheKey, p);
    } catch {
      /* non-fatal: header falls back to "Tutor" */
    }
  }, [userId]);

  const loadStreak = useCallback(async () => {
    if (!userId) return;
    try {
      // TODO(rpc): record_login_streak() — atomic, returns { streak, best_streak }
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("login_activity")
        .select("streak, best_streak, login_date")
        .eq("user_id", userId)
        .order("login_date", { ascending: false })
        .limit(1);

      const last = data?.[0];
      let nextStreak = 1;
      let nextBest = 1;
      if (last) {
        const diff = Math.floor(
          (new Date(today).getTime() - new Date(last.login_date).getTime()) /
          86400000
        );
        if (diff === 0) {
          nextStreak = last.streak ?? 1;
          nextBest = last.best_streak ?? nextStreak;
        } else if (diff === 1) {
          nextStreak = (last.streak ?? 0) + 1;
          nextBest = Math.max(last.best_streak ?? 0, nextStreak);
        } else {
          nextStreak = 1;
          nextBest = last.best_streak ?? 1;
        }
      }

      if (mounted.current) {
        setStreak(nextStreak);
        setBestStreak(nextBest);
      }

      await supabase.from("login_activity").upsert(
        {
          user_id: userId,
          login_date: today,
          streak: nextStreak,
          best_streak: nextBest,
        },
        { onConflict: "user_id,login_date" }
      );
    } catch {
      /* streak is cosmetic */
    }
  }, [userId]);

  // ---------------------------------------------------------------
  // CLASSES + LINKED STUDENTS
  // ---------------------------------------------------------------
  const loadClasses = useCallback(async () => {
    if (!userId) return;
    setLoadingClasses(true);
    try {
      const data = await fetchWithDedupe(
        `class:list:${userId}`,
        async () => {
          const { data: classRows, error } = await supabase
            .from("tutor_classes")
            .select("id, tutor_id, block, year, semester, class_name, is_active")
            .eq("tutor_id", userId)
            .eq("is_active", true)
            .order("year", { ascending: false })
            .order("semester", { ascending: false })
            .order("block", { ascending: true });
          if (error) throw error;

          const ids = (classRows ?? []).map((c) => c.id);
          const counts = new Map<string, number>();
          if (ids.length > 0) {
            const { data: links } = await supabase
              .from("tutor_students")
              .select("block, year, semester")
              .eq("tutor_id", userId);
            for (const l of links ?? []) {
              const k = `b:${l.block}|y:${l.year}|s:${l.semester}`;
              counts.set(k, (counts.get(k) ?? 0) + 1);
            }
          }
          return (classRows ?? []).map<TutorClass>((c) => ({
            ...c,
            student_count:
              counts.get(`b:${c.block}|y:${c.year}|s:${c.semester}`) ?? 0,
          }));
        },
        PROFILE_TTL
      );

      if (mounted.current) {
        setClasses(
          data.map((c) => ({
            id: c.id,
            block: c.block,
            year: c.year,
            semester: c.semester,
            class_name: c.class_name,
            student_count: c.student_count,
          }))
        );
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load classes");
    } finally {
      if (mounted.current) setLoadingClasses(false);
    }
  }, [userId]);

  const loadLinked = useCallback(async () => {
    if (!userId) return;
    setLoadingLinked(true);
    try {
      const { data, error } = await supabase
        .from("tutor_students")
        .select(
          `id, student_id, block, year, semester,
           profiles!tutor_students_student_id_fkey(name, username, avatar_url)`
        )
        .eq("tutor_id", userId)
        .order("block", { ascending: true })
        .order("year", { ascending: true })
        .order("semester", { ascending: true });

      if (error) throw error;

      const flat: LinkedStudent[] = (data ?? []).map((r: RawLinkedRow) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          student_id: r.student_id,
          block: r.block,
          year: r.year,
          semester: r.semester,
          name: p?.name ?? null,
          username: p?.username ?? null,
          avatar_url: p?.avatar_url ?? null,
        };
      });

      if (mounted.current) setLinked(flat);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load students");
    } finally {
      if (mounted.current) setLoadingLinked(false);
    }
  }, [userId]);

  // ---------------------------------------------------------------
  // BOOT
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      await Promise.all([loadProfile(), loadStreak()]);
      if (!alive) return;
      await Promise.all([loadClasses(), loadLinked()]);
      if (alive && mounted.current) setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId, loadProfile, loadStreak, loadClasses, loadLinked]);

  // ---------------------------------------------------------------
  // DERIVED
  // ---------------------------------------------------------------
  const membershipByClass = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of classes) {
      const key = `b:${c.block}|y:${c.year}|s:${c.semester}`;
      const set = new Set<string>();
      for (const s of linked) {
        if (`b:${s.block}|y:${s.year}|s:${s.semester}` === key) {
          set.add(s.student_id);
        }
      }
      m.set(c.id, set);
    }
    return m;
  }, [classes, linked]);

  const totalStudents = linked.length;

  // ---------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------

  // 🔑 THE FIX — invalidate the class: cache before refetching.
  // Without this, fetchWithDedupe returns the pre-mutation list for 5 min,
  // so a newly created class never appears until cache TTL expires.
  const refreshAfterMutation = useCallback(async () => {
    cacheInvalidate("class:");
    await Promise.all([loadClasses(), loadLinked()]);
  }, [loadClasses, loadLinked]);

  const handleDeleteClass = useCallback(
    async (cls: ClassRowData) => {
      const prevClasses = classes;
      const prevLinked = linked;

      // optimistic
      setClasses((c) => c.filter((x) => x.id !== cls.id));
      setLinked((l) =>
        l.filter(
          (s) =>
            !(
              s.block === cls.block &&
              s.year === cls.year &&
              s.semester === cls.semester
            )
        )
      );

      try {
        await supabase
          .from("tutor_students")
          .delete()
          .eq("tutor_id", userId)
          .eq("block", cls.block)
          .eq("year", cls.year)
          .eq("semester", cls.semester);

        const { error } = await supabase
          .from("tutor_classes")
          .delete()
          .eq("id", cls.id)
          .eq("tutor_id", userId);
        if (error) throw error;

        cacheInvalidate("class:");
        toast.success("Class deleted");
      } catch (e: any) {
        if (mounted.current) {
          setClasses(prevClasses);
          setLinked(prevLinked);
        }
        toast.error(e?.message ?? "Failed to delete");
      }
    },
    [classes, linked, userId]
  );

  const handleRemoveStudent = useCallback(
    async (student: CohortStudent) => {
      const prev = linked;
      setLinked((l) => l.filter((s) => s.student_id !== student.student_id));
      try {
        const { error } = await supabase
          .from("tutor_students")
          .delete()
          .eq("tutor_id", userId)
          .eq("student_id", student.student_id);
        if (error) throw error;

        cacheInvalidate("class:"); // counts changed
        toast.success("Student removed");
        loadClasses();
      } catch (e: any) {
        if (mounted.current) setLinked(prev);
        toast.error(e?.message ?? "Failed to remove");
      }
    },
    [linked, userId, loadClasses]
  );

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  // pages/TutorDashboard.tsx

  // ...(keep everything above `if (!userId) return null` unchanged)

  if (!userId) return <TutorDashboardSkeleton />;
  if (booting) return <TutorDashboardSkeleton />;

  return (
    <div className="min-h-screen bg-transparent">
      <TutorHeader
        name={profile?.name ?? "Tutor"}
        classCount={classes.length}
        studentCount={totalStudents}
        streak={streak}
      />

      <main className="max-w-3xl mx-auto px-2 py-2 space-y-2 pb-24">
        <TutorStatsRow
          streak={streak}
          bestStreak={bestStreak}
          studentCount={totalStudents}
        />

        <TutorQuickAction />
        <TutorShare />

        <ClassList
          classes={classes}
          loading={loadingClasses}
          onNew={() => {
            setEditing(null);
            setCreateOpen(true);
          }}
          onMessage={(c) => {
            setAnnounceClass(c);
            tap();
          }}
          onEdit={(c) => {
            setEditing(c);
            setCreateOpen(true);
          }}
          onDelete={handleDeleteClass}
        />

        <AddStudentsCard
          tutorId={userId}
          institution={profile?.institution ?? null}
          classes={classes}
          membershipByClass={membershipByClass}
          onInstitutionChanged={() => {
            loadProfile();
            refreshAfterMutation();
          }}
          onAdded={refreshAfterMutation}
        />

        <CohortStudentList
          linked={linked}
          loading={loadingLinked}
          onOpenStudent={(s) => {
            tap();
            setOpenStudentId(s.student_id);
          }}
          onRemoveStudent={handleRemoveStudent}
        />

        <CohortAnnouncement
          linkedStudents={linked.map((l) => ({
            student_id: l.student_id,
            block: l.block,
            year: l.year,
            semester: l.semester,
            profiles: { name: l.name, username: l.username },
          }))}
          onCompose={() => {
            tap();
            setComposeOpen(true);
          }}
        />

        <DailyStatus />
        <ConnectCards />

        <TermsButton />
      </main>

      {/* ─────────────────── SHEETS ─────────────────── */}

      <CreateClassSheet
        open={createOpen}
        tutorId={userId}
        editing={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSaved={refreshAfterMutation}
      />

      {/*
      ONE SendAnnouncementSheet, mounted once outside <main>.
      - If announceClass is set → preselected cohort mode.
      - If composeOpen is true   → picker mode (cls = null).
      - open = announceClass OR composeOpen.
    */}
      <SendAnnouncementSheet
        open={!!announceClass || composeOpen}
        tutorId={userId}
        cls={announceClass}
        classes={classes}
        onClose={() => {
          setAnnounceClass(null);
          setComposeOpen(false);
        }}
        onSent={() => {
          /* toast in sheet */
        }}
      />

      <UserProfileModal
        userId={openStudentId}
        onClose={() => setOpenStudentId(null)}
      />
    </div>
  );
}