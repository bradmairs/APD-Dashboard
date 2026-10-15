import { useRef, useState } from "react";
import { Attachment } from "../types";
import { formatDate, formatFileSize } from "../format";
import { attachmentDownloadUrl } from "../api";

interface Props {
  attachments: Attachment[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachment: Attachment) => Promise<void>;
}

export default function AttachmentsPanel({ attachments, onUpload, onDelete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Attachments
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Upload file"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2 mb-3">
          {error}
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No files attached yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {attachments.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between text-sm">
              <div className="min-w-0">
                <a
                  href={attachmentDownloadUrl(a.id)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate block"
                >
                  {a.originalName}
                </a>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(a.size)} · uploaded by {a.uploadedByName} on{" "}
                  {formatDate(a.createdAt)}
                </div>
              </div>
              <button
                onClick={() => onDelete(a)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline ml-3 shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
