import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { readFileSync } from "node:fs";

type Rgb = [number, number, number];

export type PdfPageSize = "a4" | "letter";

type TextOptions = {
  size?: number;
  font?: "regular" | "bold";
  color?: Rgb;
  lineHeight?: number;
  maxWidth?: number;
};

type ImageOptions = {
  width?: number;
  height?: number;
};

const PAGE_SIZES: Record<PdfPageSize, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const FONT_NAMES = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
};

export class SimplePdf {
  readonly width: number;
  readonly height: number;
  readonly margin = 48;
  private doc: PDFKit.PDFDocument;
  private y: number;

  constructor(size: PdfPageSize = "a4") {
    const [width, height] = PAGE_SIZES[size];
    this.width = width;
    this.height = height;
    this.doc = new PDFDocument({
      autoFirstPage: false,
      bufferPages: true,
      compress: true,
      margins: { top: this.margin, right: this.margin, bottom: this.margin, left: this.margin },
      size: [width, height],
    });
    this.y = this.height - this.margin;
    this.addPage();
  }

  addPage() {
    this.doc.addPage({ size: [this.width, this.height], margins: { top: this.margin, right: this.margin, bottom: this.margin, left: this.margin } });
    this.y = this.height - this.margin;
  }

  ensureSpace(height: number) {
    if (this.y - height < this.margin) {
      this.addPage();
    }
  }

  moveDown(amount: number) {
    this.y -= amount;
  }

  currentY() {
    return this.y;
  }

  setY(value: number) {
    this.y = value;
  }

  rect(x: number, y: number, width: number, height: number, options: { fill?: Rgb; stroke?: Rgb; lineWidth?: number } = {}) {
    const top = this.toTopY(y) - height;
    this.doc.save();
    if (options.lineWidth) this.doc.lineWidth(options.lineWidth);
    if (options.fill && options.stroke) {
      this.doc.rect(x, top, width, height).fillAndStroke(rgb(options.fill), rgb(options.stroke));
    } else if (options.fill) {
      this.doc.rect(x, top, width, height).fill(rgb(options.fill));
    } else {
      this.doc.rect(x, top, width, height).stroke(rgb(options.stroke || [0, 0, 0]));
    }
    this.doc.restore();
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = [0, 0, 0], width = 1) {
    this.doc.save();
    this.doc.lineWidth(width).strokeColor(rgb(color)).moveTo(x1, this.toTopY(y1)).lineTo(x2, this.toTopY(y2)).stroke();
    this.doc.restore();
  }

  logoMark(x: number, y: number, size = 32, color: Rgb = [255, 138, 22]) {
    const top = this.toTopY(y);
    this.doc.save();
    this.doc.fillColor(rgb(color));
    this.doc.circle(x + size * 0.32, top + size * 0.22, size * 0.12).fill();
    this.doc
      .moveTo(x + size * 0.12, top + size * 0.62)
      .bezierCurveTo(x + size * 0.38, top + size * 0.52, x + size * 0.64, top + size * 0.35, x + size * 0.74, top + size * 0.02)
      .lineTo(x + size * 0.86, top + size * 0.20)
      .lineTo(x + size * 0.74, top + size * 0.20)
      .bezierCurveTo(x + size * 0.66, top + size * 0.46, x + size * 0.43, top + size * 0.70, x + size * 0.04, top + size * 0.82)
      .closePath()
      .fill();
    this.doc
      .moveTo(x + size * 0.20, top + size * 0.82)
      .bezierCurveTo(x + size * 0.38, top + size * 0.98, x + size * 0.68, top + size * 0.98, x + size * 0.84, top + size * 0.82)
      .bezierCurveTo(x + size * 0.76, top + size * 0.70, x + size * 0.58, top + size * 0.70, x + size * 0.48, top + size * 0.78)
      .bezierCurveTo(x + size * 0.38, top + size * 0.86, x + size * 0.26, top + size * 0.86, x + size * 0.20, top + size * 0.82)
      .fill();
    this.doc.restore();
  }

  text(text: string, x: number, y: number, options: TextOptions = {}) {
    const size = options.size || 10;
    this.doc
      .font(FONT_NAMES[options.font || "regular"])
      .fontSize(size)
      .fillColor(rgb(options.color || [0, 0, 0]))
      .text(cleanText(text), x, this.toTopY(y) - size, {
        lineBreak: false,
        width: options.maxWidth,
      });
  }

  image(filePath: string, x: number, y: number, options: ImageOptions = {}) {
    try {
      const image = readFileSync(filePath);
      const source = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength);
      this.doc.image(source, x, this.toTopY(y), options);
      return true;
    } catch {
      return false;
    }
  }

  write(text: string, options: TextOptions = {}) {
    const x = this.margin;
    const maxWidth = options.maxWidth || this.width - this.margin * 2;
    const size = options.size || 10;
    const lineHeight = options.lineHeight || size * 1.35;
    const lines = wrapText(text, maxWidth, size);
    for (const line of lines) {
      this.ensureSpace(lineHeight + 2);
      this.text(line, x, this.y, { ...options, size, maxWidth });
      this.y -= lineHeight;
    }
  }

  points(items: string[] | string, options: TextOptions & { maxItems?: number } = {}) {
    extractPoints(items, options.maxItems || 8).forEach((item) => {
      this.bullet(item, options);
    });
  }

  heading(title: string) {
    if (this.y < this.height - this.margin - 6) {
      this.y -= 10;
    }
    this.ensureSpace(42);
    this.rect(this.margin, this.y - 4, 4, 18, { fill: [185, 99, 36] });
    this.text(title, this.margin + 12, this.y, { size: 14, font: "bold", color: [29, 27, 24] });
    this.y -= 26;
  }

  bullet(text: string, options: TextOptions = {}) {
    const size = options.size || 9.5;
    const lineHeight = options.lineHeight || size * 1.5;
    const x = this.margin + 12;
    const lines = wrapText(text, (options.maxWidth || this.width - this.margin * 2) - 12, size);
    lines.forEach((line, index) => {
      this.ensureSpace(lineHeight + 4);
      if (index === 0) {
        this.rect(this.margin + 2, this.y - 2, 4, 4, { fill: [185, 99, 36] });
      }
      this.text(line, x, this.y, { ...options, size });
      this.y -= lineHeight;
    });
    this.y -= 5;
  }

  card(title: string, body: string, accent: Rgb = [185, 99, 36]) {
    const width = this.width - this.margin * 2;
    const titleLines = wrapText(title, width - 24, 10.5);
    const bodyLines = wrapText(body, width - 24, 9);
    const height = 40 + titleLines.length * 16 + bodyLines.length * 15;
    if (height > (this.height - this.margin * 2) * 0.45) {
      this.ensureSpace(32);
      this.rect(this.margin, this.y - 22, width, 28, { fill: [246, 241, 232], stroke: [228, 217, 200], lineWidth: 0.8 });
      this.rect(this.margin, this.y - 22, 4, 28, { fill: accent });
      this.text(title, this.margin + 12, this.y - 6, { size: 10.5, font: "bold", color: accent, maxWidth: width - 24 });
      this.y -= 38;
      this.points(body, { size: 9, color: [29, 27, 24], maxItems: 6 });
      this.y -= 4;
      return;
    }
    this.ensureSpace(height + 10);
    const bottom = this.y - height;
    this.rect(this.margin, bottom, width, height, { fill: [246, 241, 232], stroke: [228, 217, 200], lineWidth: 0.8 });
    this.rect(this.margin, bottom, 4, height, { fill: accent });
    let lineY = this.y - 20;
    titleLines.forEach((line) => {
      this.text(line, this.margin + 12, lineY, { size: 10.5, font: "bold", color: accent });
      lineY -= 16;
    });
    bodyLines.forEach((line) => {
      this.text(line, this.margin + 12, lineY, { size: 9, color: [29, 27, 24] });
      lineY -= 15;
    });
    this.y = bottom - 22;
  }

  footer(label: string) {
    const range = this.doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      this.doc.switchToPage(index);
      const y = 28;
      this.line(this.margin, y + 12, this.width - this.margin, y + 12, [228, 217, 200], 0.5);
      this.text(label, this.margin, y, { size: 7, color: [107, 98, 87] });
      this.text(`Page ${index + 1}`, this.width - this.margin - 36, y, { size: 7, color: [107, 98, 87] });
    }
    this.doc.switchToPage(range.count - 1);
  }

  output() {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      this.doc.on("error", reject);
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.end();
    });
  }

  private toTopY(value: number) {
    return this.height - value;
  }
}

export function pdfFileName(name: string, suffix: string) {
  const cleaned = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "monkaudit";
  return `${cleaned}-${suffix}.pdf`;
}

export function scoreColor(score: number): Rgb {
  if (!score) return [107, 98, 87];
  if (score < 40) return [185, 28, 28];
  if (score < 65) return [180, 83, 9];
  if (score < 80) return [21, 128, 61];
  return [6, 95, 70];
}

export function normalizePageSize(value: string | null): PdfPageSize {
  return value === "letter" ? "letter" : "a4";
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = cleanText(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (estimateWidth(next, fontSize) <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function extractPoints(items: string[] | string, maxItems: number) {
  if (Array.isArray(items)) {
    return items.map((item) => cleanText(item).trim()).filter(Boolean).slice(0, maxItems);
  }
  const text = cleanText(items);
  const explicit = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  const source = explicit.length > 1 ? explicit : text.split(/(?<=[.!?;])\s+/);
  return source
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.length > 150 ? `${item.slice(0, 147).trim()}...` : item))
    .slice(0, maxItems);
}

function estimateWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.62;
}

function rgb(color: Rgb) {
  return `#${color.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
}

function cleanText(text: unknown) {
  return String(text || "")
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/★/g, "*")
    .replace(/→/g, "->")
    .replace(/⚠/g, "Warning:")
    .replace(/â€“|â€”/g, "-")
    .replace(/â€¢|Â·/g, "-")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/â˜…/g, "*")
    .replace(/â†’/g, "->")
    .replace(/âš /g, "Warning:")
    .replace(/Â/g, "");
}
