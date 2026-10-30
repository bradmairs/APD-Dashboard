import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { CommunityEnquiry, CommunityEnquiryInput, EnquiryStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_ENQUIRY_STATUSES,
  ENQUIRY_CATEGORY_LABELS,
  ENQUIRY_STATUS_COLORS,
  ENQUIRY_STATUS_LABELS,
  enquiryStatusRank,
} from "../enquiryMeta";
import EnquiryFormModal from "./EnquiryFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  enquiries: CommunityEnquiry[];
  onCreate: (data: Partial<CommunityEnquiryInput>) => Promise<void>;
  onUpdate: (enquiry: CommunityEnquiry, data: Partial<CommunityEnquiryInput>) => Promise<void>;
  onDelete: (enquiry: CommunityEnquiry) => Promise<void>;
}

export default function EnquiriesPanel({ enquiries, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommunityEnquiry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCount = enquiries.filter(
    (e) => e.status !== "RESOLVED" && e.status !== "CLOSED"
  ).length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(enquiry: CommunityEnquiry) {
    setEditing(enquiry);
    setShowModal(true);
  }

  async function handleSave(data: Partial<CommunityEnquiryInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(enquiry: CommunityEnquiry) {
    if (!await confirm("Delete this enquiry? This cannot be undone.")) return;
    await onDelete(enquiry);
  }

  async function handleStatusChange(enquiry: CommunityEnquiry, status: EnquiryStatus) {
    await onUpdate(enquiry, { status });
  }

  const sorted = [...enquiries].sort(
    (a, b) => enquiryStatusRank(a.status) - enquiryStatusRank(b.status)
  );

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Community Enquiries &amp; Complaints
          </h2>
          {enquiries.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} open of {enquiries.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="community-enquiries" rows={enquiries} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Enquiry
          </button>
        </div>
      </div>

      {enquiries.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No community enquiries or complaints logged yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((enquiry) => {
              const isExpanded = expandedId === enquiry.id;
              return (
                <li key={enquiry.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : enquiry.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {enquiry.reference ? `${enquiry.reference}: ` : ""}
                          {enquiry.description}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {ENQUIRY_CATEGORY_LABELS[enquiry.category]}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${ENQUIRY_STATUS_COLORS[enquiry.status]}`}
                        >
                          {ENQUIRY_STATUS_LABELS[enquiry.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>Received {formatDate(enquiry.dateReceived)}</span>
                        {enquiry.assignedTo && <span>Assigned to {enquiry.assignedTo}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={enquiry.status}
                        onChange={(e) =>
                          handleStatusChange(enquiry, e.target.value as EnquiryStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_ENQUIRY_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {ENQUIRY_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(enquiry)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(enquiry)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {(enquiry.source || enquiry.contactName || enquiry.contactDetails) && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {enquiry.source && <span>Via {enquiry.source}</span>}
                          {enquiry.contactName && (
                            <span>
                              {enquiry.source ? " · " : ""}
                              {enquiry.contactName}
                            </span>
                          )}
                          {enquiry.contactDetails && <span> · {enquiry.contactDetails}</span>}
                        </div>
                      )}
                      {enquiry.resolution && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Resolution
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={enquiry.resolution} />
                        </div>
                      )}
                      {enquiry.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={enquiry.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Logged by {enquiry.loggedByName}
                        {enquiry.dateResolved && ` · Resolved ${formatDate(enquiry.dateResolved)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="enquiries" />
        </>
      )}

      {showModal && (
        <EnquiryFormModal
          enquiry={editing}
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
