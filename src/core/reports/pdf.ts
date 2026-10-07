import { PDFDocument, StandardFonts } from "pdf-lib";

export interface PdfSection {
  heading?: string;
  lines: string[];
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const LINE_HEIGHT = 13;
const CHARS_PER_LINE = 92;

function wrap(text: string): string[] {
  if (text.length <= CHARS_PER_LINE) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > CHARS_PER_LINE) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Deterministic text PDF (§7.7): title plus wrapped sections, no external assets. */
export async function buildTextPdf(title: string, sections: PdfSection[]): Promise<string> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureRoom = (needed: number): void => {
    if (y - needed < MARGIN) {
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawWrapped = (text: string, size: number, font: typeof regular): void => {
    for (const line of wrap(text)) {
      ensureRoom(LINE_HEIGHT);
      page.drawText(line, { x: MARGIN, y, size, font, lineHeight: LINE_HEIGHT });
      y -= LINE_HEIGHT;
    }
  };

  drawWrapped(title, 16, bold);
  y -= 8;

  for (const section of sections) {
    if (section.heading) {
      ensureRoom(LINE_HEIGHT * 2);
      y -= 6;
      page.drawText(section.heading, { x: MARGIN, y, size: 11.5, font: bold });
      y -= LINE_HEIGHT + 2;
    }
    for (const line of section.lines) {
      if (line === "") {
        y -= LINE_HEIGHT / 2;
        continue;
      }
      drawWrapped(line, 9.5, regular);
    }
  }

  const bytes = await document.save();
  return Buffer.from(bytes).toString("base64");
}
