import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  level: Level;
  goals: string;
  joined_at: string;
  gender: string | null;
  course_start_date: string | null;
  lessons_purchased: number | null;
  lessons_reset_at: string | null;
  placeholder_email: boolean | null;
  lessons_paid_off: number | null;
  lessons_left_override: number | null;
}


export interface Lesson {
  id: string;
  student_id: string;
  lesson_date: string;
  lesson_time: string;
  topic: string;
  zoom_link: string | null;
  teams_link: string | null;
  homework: string | null;
  notes: string | null;
  attendance: "present" | "absent" | "late" | "scheduled";
  completed: boolean;
  quiz_name?: string | null;
  quiz_score?: number | null;
  quiz_max?: number | null;
  quizzes?: { name: string; score: number | null; max: number | null }[] | null;
}

export interface QuizEntry { name: string; score: number | null; max: number | null }

export function lessonQuizzes(l: Pick<Lesson, "quizzes" | "quiz_name" | "quiz_score" | "quiz_max">): QuizEntry[] {
  if (l.quizzes && l.quizzes.length > 0) return l.quizzes;
  if (l.quiz_score !== null && l.quiz_score !== undefined)
    return [{ name: l.quiz_name || "Quiz", score: l.quiz_score, max: l.quiz_max ?? null }];
  return [];
}

export interface Score {
  id: string;
  student_id: string;
  year: number;
  month: string;
  speaking: number;
  grammar: number;
  listening: number | null;
  writing: number | null;
}

export interface Homework {
  id: string;
  student_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  assigned_at: string;
  due_at: string | null;
  completed: boolean;
}

export function useStudents() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // get student role ids
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("id", ids)
      .order("full_name");
    setStudents((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { students, loading, reload: load };
}

export function useStudent(id: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: l }, { data: s }, { data: h }, { data: n }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("*").eq("student_id", id).order("lesson_date", { ascending: false }).order("lesson_time", { ascending: false }),
      supabase.from("scores").select("*").eq("student_id", id).order("year").order("month"),
      supabase.from("homework").select("*").eq("student_id", id).order("assigned_at", { ascending: false }),
      supabase.from("student_notes").select("notes").eq("student_id", id).maybeSingle(),
    ]);
    setProfile(p as Profile | null);
    setNotes((n as { notes: string } | null)?.notes ?? "");
    setLessons((l as Lesson[]) ?? []);
    setScores((s as Score[]) ?? []);
    setHomework((h as Homework[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  return { profile, notes, lessons, scores, homework, loading, reload: load };
}


export function useAllLessons() {
  const [lessons, setLessons] = useState<(Lesson & { profiles: Pick<Profile, "id" | "full_name" | "avatar_url" | "level"> })[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lessons")
      .select("*, profiles!inner(id, full_name, avatar_url, level)")
      .order("lesson_date", { ascending: false })
      .order("lesson_time", { ascending: false });
    setLessons((data as any) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { lessons, loading, reload: load };
}
