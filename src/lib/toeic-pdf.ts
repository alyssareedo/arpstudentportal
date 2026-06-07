import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SECTION_LABELS, type ToeicSection } from "./toeic-scoring";
import logo from "@/assets/logo.png";

export interface ToeicReportData {
  studentName: string;
  studentEmail?: string | null;
  completedAt: string;
  toeicScore: number;
  cefr: string;
  totalCorrect: number;
  totalQuestions: number;
  sections: {
    section: ToeicSection;
    correct: number;
    total: number;
    percent: number;
  }[];
  strengths: ToeicSection[];
  weaknesses: ToeicSection[];
  recommendations: string;
  teacherComments?: { author: string; body: string; created_at: string }[];
}

export async function generateToeicReport(data: ToeicReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 40;

  // Logo
  try {
    const img = await fetch(logo).then((r) => r.blob());
    const dataUrl: string = await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(img);
    });
    doc.addImage(dataUrl, "PNG", 40, y, 50, 50);
  } catch {
    /* logo optional */
  }

  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text("TOEIC Placement Test Report", 110, y + 22);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("ARP Speak English With Me", 110, y + 40);
  y += 80;

  // Student info
  doc.setFontSize(11);
  doc.setTextColor(33);
  doc.text(`Student: ${data.studentName}`, 40, y);
  if (data.studentEmail) doc.text(`Email: ${data.studentEmail}`, 40, y + 16);
  doc.text(`Completed: ${new Date(data.completedAt).toLocaleString()}`, 40, y + (data.studentEmail ? 32 : 16));
  y += data.studentEmail ? 56 : 40;

  // Big score card
  doc.setFillColor(238, 246, 255);
  doc.roundedRect(40, y, pageW - 80, 80, 8, 8, "F");
  doc.setFontSize(28);
  doc.setTextColor(30, 64, 175);
  doc.text(`${data.toeicScore} / 990`, 60, y + 45);
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text("Estimated TOEIC Score", 60, y + 62);

  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110);
  doc.text(`CEFR ${data.cefr}`, pageW - 160, y + 45);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${data.totalCorrect} / ${data.totalQuestions} correct`, pageW - 160, y + 62);
  y += 100;

  // Section breakdown
  autoTable(doc, {
    startY: y,
    head: [["Section", "Correct", "Total", "%"]],
    body: data.sections.map((s) => [
      SECTION_LABELS[s.section],
      String(s.correct),
      String(s.total),
      `${Math.round(s.percent * 100)}%`,
    ]),
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: 40, right: 40 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // Strengths & weaknesses
  doc.setFontSize(13);
  doc.setTextColor(15, 118, 110);
  doc.text("Strengths", 40, y);
  doc.setFontSize(11);
  doc.setTextColor(33);
  data.strengths.forEach((s, i) => doc.text(`• ${SECTION_LABELS[s]}`, 50, y + 18 + i * 14));
  y += 18 + data.strengths.length * 14 + 12;

  doc.setFontSize(13);
  doc.setTextColor(190, 24, 93);
  doc.text("Areas to improve", 40, y);
  doc.setFontSize(11);
  doc.setTextColor(33);
  data.weaknesses.forEach((s, i) => doc.text(`• ${SECTION_LABELS[s]}`, 50, y + 18 + i * 14));
  y += 18 + data.weaknesses.length * 14 + 16;

  // Recommendations
  doc.setFontSize(13);
  doc.setTextColor(30, 64, 175);
  doc.text("Recommended study plan", 40, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(60);
  const recLines = doc.splitTextToSize(data.recommendations || "Keep practising!", pageW - 80);
  doc.text(recLines, 40, y);
  y += recLines.length * 13 + 10;

  // Teacher comments
  if (data.teacherComments && data.teacherComments.length) {
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(13);
    doc.setTextColor(33);
    doc.text("Teacher comments", 40, y);
    y += 16;
    doc.setFontSize(10);
    data.teacherComments.forEach((c) => {
      const text = `${c.author} — ${new Date(c.created_at).toLocaleDateString()}\n${c.body}`;
      const lines = doc.splitTextToSize(text, pageW - 80);
      doc.text(lines, 40, y);
      y += lines.length * 13 + 8;
    });
  }

  doc.save(`TOEIC_Report_${data.studentName.replace(/\s+/g, "_")}.pdf`);
}
