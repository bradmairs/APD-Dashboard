import { useState } from "react";
import { DocumentRecord, DocumentRecordInput, DocumentStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_DOCUMENT_STATUSES,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_STATUS_LABELS,
  documentStatusRank,
} from "../documentMeta";
import DocumentFormModal from "./DocumentFormModal";
import ExportCsvButton from "./ExportCsvButton";
import ImportCsvButton from "./ImportCsvButton";
import { parseImportDate, parseOptionalEnum, requireCell } from "../csvImport";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

const DOCUMENT_IMPORT_HEADERS = [
  "Document Number",
  "Title",
  "Category",
  "Revision",
  "Status",
  "Issue Date",
  "Description",
  "Notes",
];

function parseDocumentImportRow(row: Record<string, string>): Partial<DocumentRecordInput> {
  return {
    documentNumber: requireCell(row, "Document Number"),
    title: requireCell(row, "Title"),
    category: row["Category"] || null,
    revision: requireCell(row, "Revision"),
    status: parseOptionalEnum(DOCUMENT_STATUS_LABELS, row["Status"], "Status") ?? "DRAFT",
    issueDate: parseImportDate(row["Issue Date"] ?? ""),
    description: row["Description"] || null,
    notes: row["Notes"] || null,
  };
}

interface Props {
  documents: DocumentRecord[];
  onCreate: (data: Partial<DocumentRecordInput>) => Promise<void>;
  onUpdate: (document: DocumentRecord, data: Partial<DocumentRecordInput>) => Promise<void>;
  onDelete: (document: DocumentRecord) => Promise<void>;
}

export default function DocumentsPanel({ documents, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  async function handleBulkStatus(status: DocumentStatus) {
    for (const document of documents.filter((d) => selection.isSelected(d.id))) {
      await onUpdate(document, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const document of documents.filter((d) => selection.isSelected(d.id))) {
      await onDelete(document);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(document: DocumentRecord) {
    setEditing(document);
    setShowModal(true);
  }

  async function handleSave(data: Partial<DocumentRecordInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(document: DocumentRecord) {
    if (!await confirm(`Delete "${document.documentNumber}: ${document.title}"? This cannot be undone.`))
      return;
    await onDelete(document);
  }

  async function handleStatusChange(document: DocumentRecord, status: DocumentStatus) {
    await onUpdate(document, { status });
  }

  const sorted = [...documents].sort(
    (a, b) => documentStatusRank(a.status) - documentStatusRank(b.status)
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Document Register
          </h2>
          {documents.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {documents.length} document{documents.length === 1 ? "" : "s"}
            </span>
          )}
          {documents.length > 0 && (
            <button
              onClick={() => selection.toggleAll(sorted.map((d) => d.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === documents.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="document-register"
            columns={[
              { header: "Document Number", key: "documentNumber" },
              { header: "Title", key: "title" },
              { header: "Category", key: "category" },
              { header: "Revision", key: "revision" },
              { header: "Status", key: "status" },
              { header: "Issue Date", key: "issueDate" },
              { header: "Uploaded By", key: "uploadedBy" },
              { header: "Description", key: "description" },
              { header: "Notes", key: "notes" },
            ]}
            rows={sorted.map((document) => ({
              documentNumber: document.documentNumber,
              title: document.title,
              category: document.category ?? "",
              revision: document.revision,
              status: DOCUMENT_STATUS_LABELS[document.status],
              issueDate: document.issueDate ? formatDate(document.issueDate) : "",
              uploadedBy: document.uploadedByName,
              description: document.description ?? "",
              notes: document.notes ?? "",
            }))}
          />
          <ImportCsvButton
            entityLabel="document"
            expectedHeaders={DOCUMENT_IMPORT_HEADERS}
            parseRow={parseDocumentImportRow}
            onImportRow={onCreate}
            onImported={async () => {}}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Document
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="document"
          statusOptions={ALL_DOCUMENT_STATUSES.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No documents recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((document) => {
            const isExpanded = expandedId === document.id;
            return (
              <li key={document.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(document.id)}
                    onChange={() => selection.toggle(document.id)}
                    className="mt-1.5 h-4 w-4 shrink-0"
                  />
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : document.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {document.documentNumber}: {document.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        {document.revision}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_STATUS_COLORS[document.status]}`}
                      >
                        {DOCUMENT_STATUS_LABELS[document.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {document.category && <span>{document.category}</span>}
                      {document.issueDate && <span>Issued {formatDate(document.issueDate)}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={document.status}
                      onChange={(e) =>
                        handleStatusChange(document, e.target.value as DocumentStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_DOCUMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {DOCUMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(document)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(document)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {document.description && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Description
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {document.description}
                        </p>
                      </div>
                    )}
                    {document.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {document.notes}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Added by {document.uploadedByName}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <DocumentFormModal
          document={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
