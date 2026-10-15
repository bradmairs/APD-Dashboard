import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, "../uploads");

// Drawings, contracts, correspondence — the file types an APD project
// actually accumulates. Extension is trusted only from this allowlist;
// the on-disk filename itself is always a fresh random UUID, never the
// client-supplied name, so a crafted filename can't escape the upload dir
// or overwrite another file.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".txt",
  ".csv",
  ".dwg",
  ".zip",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function projectUploadDir(projectId: string): string {
  return path.join(UPLOAD_DIR, projectId);
}

export function attachmentFilePath(projectId: string, storedFilename: string): string {
  return path.join(projectUploadDir(projectId), storedFilename);
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = projectUploadDir(req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ALLOWED_EXTENSIONS.has(ext) ? ext : ""}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`File type "${ext || "unknown"}" is not allowed`));
      return;
    }
    cb(null, true);
  },
});

declare global {
  namespace Express {
    interface Request {
      // Set by a pre-multer middleware once the target site visit has been
      // looked up, so the disk-storage destination (which only receives
      // `req`/`file`, never `res`) knows where on disk to write the file.
      photoUploadContext?: { projectId: string; siteVisitId: string };
    }
  }
}

// Common camera/gallery photo formats a phone actually produces. Deliberately
// narrower than the document allowlist above — these files also need to
// render as <img> thumbnails and map-popup previews in the browser, which
// rules out formats like HEIC that not every browser can display inline.
const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20MB

export function siteVisitPhotoUploadDir(projectId: string, siteVisitId: string): string {
  return path.join(UPLOAD_DIR, projectId, "site-visits", siteVisitId);
}

export function siteVisitPhotoFilePath(
  projectId: string,
  siteVisitId: string,
  storedFilename: string
): string {
  return path.join(siteVisitPhotoUploadDir(projectId, siteVisitId), storedFilename);
}

const photoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const ctx = req.photoUploadContext;
    if (!ctx) {
      cb(new Error("Site visit not found"), "");
      return;
    }
    const dir = siteVisitPhotoUploadDir(ctx.projectId, ctx.siteVisitId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${PHOTO_EXTENSIONS.has(ext) ? ext : ""}`);
  },
});

export const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!PHOTO_EXTENSIONS.has(ext)) {
      cb(new Error(`Photo type "${ext || "unknown"}" is not allowed`));
      return;
    }
    cb(null, true);
  },
});

// A transcript upload (.txt/.docx/.pdf, or a photo of handwritten notes for
// the vision model) that only exists in memory long enough to extract its
// text — nothing is persisted to disk, unlike every other upload above.
const TRANSCRIPT_EXTENSIONS = new Set([".txt", ".docx", ".pdf", ".png", ".jpg", ".jpeg"]);
const MAX_TRANSCRIPT_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const transcriptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TRANSCRIPT_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!TRANSCRIPT_EXTENSIONS.has(ext)) {
      cb(new Error(`File type "${ext || "unknown"}" is not supported for transcripts`));
      return;
    }
    cb(null, true);
  },
});
