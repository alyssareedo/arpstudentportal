export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Lesson {
  id: string;
  studentId: string;
  date: string; // ISO
  time: string;
  topic: string;
  zoomLink?: string;
  teamsLink?: string;
  homework?: string;
  notes?: string;
  attendance: "present" | "absent" | "late" | "scheduled";
  completed: boolean;
}

export interface ScoreEntry {
  month: string; // e.g. "Jan"
  speaking: number;
  grammar: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  level: Level;
  goals: string;
  joinedAt: string;
  notes: string;
  files: { name: string; size: string; uploadedAt: string }[];
  scores: ScoreEntry[];
}

const avatarFor = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export const students: Student[] = [
  {
    id: "s1",
    name: "Sofía Martínez",
    email: "sofia.m@email.com",
    phone: "+34 612 345 678",
    avatarUrl: avatarFor("Sofia"),
    level: "B2",
    goals: "Pass IELTS with 7.0, improve business vocabulary.",
    joinedAt: "2025-01-12",
    notes: "Strong writer. Needs work on conditional tenses and fluency under pressure.",
    files: [
      { name: "IELTS_Practice_Test.pdf", size: "1.2 MB", uploadedAt: "2026-04-02" },
      { name: "Essay_Draft_3.pdf", size: "240 KB", uploadedAt: "2026-05-10" },
    ],
    scores: [
      { month: "Jan", speaking: 62, grammar: 70 },
      { month: "Feb", speaking: 65, grammar: 72 },
      { month: "Mar", speaking: 70, grammar: 75 },
      { month: "Apr", speaking: 74, grammar: 78 },
      { month: "May", speaking: 78, grammar: 82 },
    ],
  },
  {
    id: "s2",
    name: "Kenji Tanaka",
    email: "kenji.t@email.com",
    phone: "+81 90 1234 5678",
    avatarUrl: avatarFor("Kenji"),
    level: "B1",
    goals: "Conversational fluency for work in tech.",
    joinedAt: "2025-09-04",
    notes: "Great listening skills. Building confidence speaking.",
    files: [{ name: "Tech_Vocabulary.pdf", size: "560 KB", uploadedAt: "2026-03-15" }],
    scores: [
      { month: "Jan", speaking: 55, grammar: 60 },
      { month: "Feb", speaking: 58, grammar: 63 },
      { month: "Mar", speaking: 62, grammar: 66 },
      { month: "Apr", speaking: 66, grammar: 68 },
      { month: "May", speaking: 70, grammar: 72 },
    ],
  },
  {
    id: "s3",
    name: "Amara Okafor",
    email: "amara.o@email.com",
    phone: "+234 803 555 0142",
    avatarUrl: avatarFor("Amara"),
    level: "C1",
    goals: "Refine academic writing for PhD applications.",
    joinedAt: "2024-11-20",
    notes: "Advanced learner. Focus on nuance and register.",
    files: [
      { name: "Academic_Style_Guide.pdf", size: "2.1 MB", uploadedAt: "2026-02-10" },
      { name: "Research_Proposal.pdf", size: "780 KB", uploadedAt: "2026-05-01" },
    ],
    scores: [
      { month: "Jan", speaking: 80, grammar: 84 },
      { month: "Feb", speaking: 82, grammar: 85 },
      { month: "Mar", speaking: 84, grammar: 87 },
      { month: "Apr", speaking: 86, grammar: 89 },
      { month: "May", speaking: 88, grammar: 91 },
    ],
  },
  {
    id: "s4",
    name: "Lucas Pereira",
    email: "lucas.p@email.com",
    phone: "+55 11 99876 5432",
    avatarUrl: avatarFor("Lucas"),
    level: "A2",
    goals: "Travel English and basic everyday conversation.",
    joinedAt: "2026-02-01",
    notes: "Beginner energy and motivation. Vocabulary growing fast.",
    files: [],
    scores: [
      { month: "Jan", speaking: 30, grammar: 35 },
      { month: "Feb", speaking: 35, grammar: 40 },
      { month: "Mar", speaking: 42, grammar: 46 },
      { month: "Apr", speaking: 48, grammar: 52 },
      { month: "May", speaking: 55, grammar: 58 },
    ],
  },
  {
    id: "s5",
    name: "Elena Petrova",
    email: "elena.p@email.com",
    phone: "+7 911 222 3344",
    avatarUrl: avatarFor("Elena"),
    level: "B2",
    goals: "Business English for client meetings.",
    joinedAt: "2025-06-18",
    notes: "Confident speaker. Polishing presentation skills.",
    files: [{ name: "Meeting_Phrases.pdf", size: "320 KB", uploadedAt: "2026-04-22" }],
    scores: [
      { month: "Jan", speaking: 68, grammar: 72 },
      { month: "Feb", speaking: 70, grammar: 74 },
      { month: "Mar", speaking: 72, grammar: 76 },
      { month: "Apr", speaking: 75, grammar: 78 },
      { month: "May", speaking: 78, grammar: 80 },
    ],
  },
  {
    id: "s6",
    name: "Mateo Rossi",
    email: "mateo.r@email.com",
    phone: "+39 333 444 5566",
    avatarUrl: avatarFor("Mateo"),
    level: "A1",
    goals: "Build foundation for university entrance.",
    joinedAt: "2026-04-05",
    notes: "Very new. Working on alphabet sounds and basic verbs.",
    files: [],
    scores: [
      { month: "Mar", speaking: 15, grammar: 20 },
      { month: "Apr", speaking: 22, grammar: 28 },
      { month: "May", speaking: 30, grammar: 35 },
    ],
  },
];

export const lessons: Lesson[] = [
  {
    id: "l1",
    studentId: "s1",
    date: "2026-05-24",
    time: "10:00",
    topic: "IELTS Writing Task 2 — argumentative essays",
    zoomLink: "https://zoom.us/j/123456789",
    homework: "Write a 250-word essay on remote work pros and cons.",
    notes: "Focus on linking words and conclusion structure.",
    attendance: "scheduled",
    completed: false,
  },
  {
    id: "l2",
    studentId: "s2",
    date: "2026-05-24",
    time: "14:30",
    topic: "Tech meeting vocabulary & roleplay",
    teamsLink: "https://teams.microsoft.com/l/meetup-join/abc",
    homework: "Prepare a 2-min pitch about your current project.",
    attendance: "scheduled",
    completed: false,
  },
  {
    id: "l3",
    studentId: "s3",
    date: "2026-05-25",
    time: "09:00",
    topic: "Academic hedging and cautious language",
    zoomLink: "https://zoom.us/j/987654321",
    homework: "Rewrite 3 paragraphs from your proposal using hedging.",
    attendance: "scheduled",
    completed: false,
  },
  {
    id: "l4",
    studentId: "s1",
    date: "2026-05-20",
    time: "10:00",
    topic: "Conditionals — second & third",
    homework: "Complete exercises 4–7 in workbook.",
    notes: "Great progress on third conditional.",
    attendance: "present",
    completed: true,
  },
  {
    id: "l5",
    studentId: "s4",
    date: "2026-05-19",
    time: "17:00",
    topic: "Ordering food and asking for directions",
    homework: "Record yourself ordering at a café.",
    attendance: "present",
    completed: true,
  },
  {
    id: "l6",
    studentId: "s5",
    date: "2026-05-18",
    time: "08:30",
    topic: "Negotiation language",
    attendance: "late",
    completed: true,
    notes: "Joined 10 min late. Strong vocabulary use.",
  },
  {
    id: "l7",
    studentId: "s2",
    date: "2026-05-17",
    time: "14:30",
    topic: "Past simple vs present perfect",
    attendance: "absent",
    completed: false,
  },
  {
    id: "l8",
    studentId: "s6",
    date: "2026-05-22",
    time: "16:00",
    topic: "Greetings, introductions, the alphabet",
    teamsLink: "https://teams.microsoft.com/l/meetup-join/xyz",
    attendance: "present",
    completed: true,
  },
];

export const attendanceTrend = [
  { week: "W1", present: 18, absent: 2 },
  { week: "W2", present: 20, absent: 1 },
  { week: "W3", present: 17, absent: 4 },
  { week: "W4", present: 22, absent: 2 },
];

export const monthlyProgress = [
  { month: "Jan", avgScore: 58 },
  { month: "Feb", avgScore: 62 },
  { month: "Mar", avgScore: 67 },
  { month: "Apr", avgScore: 71 },
  { month: "May", avgScore: 76 },
];

export const getStudent = (id: string) => students.find((s) => s.id === id);
export const getStudentLessons = (id: string) =>
  lessons.filter((l) => l.studentId === id).sort((a, b) => b.date.localeCompare(a.date));
