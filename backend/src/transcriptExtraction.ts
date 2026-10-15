import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

// A meeting transcript can arrive as plain text, a Word export, a PDF
// export, or (via the vision model, handled separately in meetingMinutes.ts
// since it needs an Ollama call) a photo of handwritten/whiteboard notes.
// This only covers the three machine-readable document formats — the
// image case never reaches here.
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

export function isImageUpload(file: Express.Multer.File): boolean {
  return IMAGE_MIME_TYPES.has(file.mimetype);
}

export async function extractTextFromDocument(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === ".txt" || file.mimetype === "text/plain") {
    return file.buffer.toString("utf8");
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (ext === ".pdf") {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(
    `Unsupported transcript file type "${ext || file.mimetype}" — use .txt, .docx, .pdf, or a photo (.png/.jpg).`
  );
}
