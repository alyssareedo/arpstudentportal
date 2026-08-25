import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/assets/logo.png";

export interface CefrReviewItem {
  level: string;
  category: string;
  prompt: string;
  options: string[];
  selected_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  explanation: string | null;
}

export interface CefrReportData {
  studentName: string;
  studentEmail?: string | null;
  takenAt: string;
  cefrLevel: string;
  totalScore: number;
  totalQuestions: number;
  breakdown: { label: string; correct: number; total: number }[];
  review: CefrReviewItem[];
}

export async function generateCefrReport(data: CefrReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 40;

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
  doc.setTextColor(33);
  doc.text("CEFR Placement Test Report", 110, y + 22);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("ARP Speak English With Me", 110, y + 40);
  y += 80;

  doc.setFontSize(11);
  doc.setTextColor(33);
  doc.text(`Student: ${data.studentName}`, 40, y);
  if (data.studentEmail) doc.text(`Email: ${data.studentEmail}`, 40, y + 16);
  doc.text(`Taken: ${new Date(data.takenAt).toLocaleString()}`, 40, y + (data.studentEmail ? 32 : 16));
  y += data.studentEmail ? 56 : 40;

  doc.setFillColor(240, 245, 255);
  doc.roundedRect(40, y, 515, 60, 8, 8, "F");
  doc.setFontSize(24);
  doc.setTextColor(20, 40, 120);
  doc.text(`Level ${data.cefrLevel}`, 60, y + 38);
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(`Score: ${data.totalScore} / ${data.totalQuestions}`, 300, y + 38);
  y += 84;

  autoTable(doc, {
    startY: y,
    head: [["Skill", "Correct", "Total", "%"]],
    body: data.breakdown.map((b) => [
      b.label,
      String(b.correct),
      String(b.total),
      b.total ? `${Math.round((b.correct / b.total) * 100)}%` : "—",
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  doc.setFontSize(14);
  doc.setTextColor(33);
  doc.text("Question-by-question review", 40, y);

  autoTable(doc, {
    startY: y + 10,
    head: [["#", "Question", "Answer given", "Correct answer", "Result", "Why"]],
    body: data.review.map((r, i) => [
      String(i + 1),
      `[${r.level}] ${r.prompt}`,
      r.selected_answer != null ? r.options[r.selected_answer] ?? "—" : "No answer",
      r.options[r.correct_answer] ?? "—",
      r.is_correct ? "Correct" : "Incorrect",
      r.explanation ?? "",
    ]),
    styles: { fontSize: 8, cellPadding: 4, valign: "top" },
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 150 },
      2: { cellWidth: 80 },
      3: { cellWidth: 80 },
      4: { cellWidth: 50 },
      5: { cellWidth: 135 },
    },
  });

  const safe = data.studentName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`cefr-report-${safe}.pdf`);
}
