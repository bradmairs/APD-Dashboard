import { useState } from "react";
import { SiteVisit, SiteVisitInput, SiteVisitPhoto } from "../types";
import { formatDateTime } from "../format";
import SiteVisitFormModal from "./SiteVisitFormModal";
import SiteVisitPhotoGrid from "./SiteVisitPhotoGrid";
import SitePhotosMap from "./SitePhotosMap";
import SitePhotosGallery from "./SitePhotosGallery";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  siteVisits: SiteVisit[];
  photosByVisit: Record<string, SiteVisitPhoto[]>;
  allPhotos: SiteVisitPhoto[];
  onCreate: (data: Partial<SiteVisitInput>) => Promise<void>;
  onUpdate: (siteVisit: SiteVisit, data: Partial<SiteVisitInput>) => Promise<void>;
  onDelete: (siteVisit: SiteVisit) => Promise<void>;
  onUploadPhotos: (siteVisit: SiteVisit, files: File[]) => Promise<void>;
  onDeletePhoto: (photo: SiteVisitPhoto) => Promise<void>;
  onSyncPhotoToArchive: (photoId: string) => Promise<void>;
}

export default function SiteVisitsPanel({
  siteVisits,
  photosByVisit,
  allPhotos,
  onCreate,
  onUpdate,
  onDelete,
  onUploadPhotos,
  onDeletePhoto,
  onSyncPhotoToArchive,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SiteVisit | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [photosView, setPhotosView] = useState<"map" | "gallery">("gallery");

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(siteVisit: SiteVisit) {
    setEditing(siteVisit);
    setShowModal(true);
  }

  async function handleSave(data: Partial<SiteVisitInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(siteVisit: SiteVisit) {
    if (
      !await confirm(`Delete the site visit at "${siteVisit.location}"? This cannot be undone.`)
    )
      return;
    await onDelete(siteVisit);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Site Visits
        </h2>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="site-visits" rows={siteVisits} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + Log Visit
          </button>
        </div>
      </div>

      {allPhotos.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Site Photos
            </div>
            <div className="inline-flex rounded border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPhotosView("gallery")}
                className={`px-2.5 py-1 ${
                  photosView === "gallery"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
              >
                Gallery
              </button>
              <button
                type="button"
                onClick={() => setPhotosView("map")}
                className={`px-2.5 py-1 border-l border-slate-300 dark:border-slate-600 ${
                  photosView === "map"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
              >
                Map
              </button>
            </div>
          </div>
          {photosView === "gallery" ? (
            <SitePhotosGallery photos={allPhotos} onDelete={onDeletePhoto} />
          ) : (
            <SitePhotosMap photos={allPhotos} />
          )}
        </div>
      )}

      {siteVisits.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No site visits logged yet.
        </p>
      ) : (
        <div className="space-y-3">
          {siteVisits.map((siteVisit) => {
            const isExpanded = expandedId === siteVisit.id;
            const photos = photosByVisit[siteVisit.id] ?? [];
            return (
              <div
                key={siteVisit.id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : siteVisit.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatDateTime(siteVisit.visitDate)}
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                      {siteVisit.location}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Visited by {siteVisit.visitedByName}
                      {photos.length > 0 &&
                        ` · ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(siteVisit)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(siteVisit)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {siteVisit.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {siteVisit.notes}
                        </p>
                      </div>
                    )}
                    {siteVisit.discussionNotes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Discussion Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {siteVisit.discussionNotes}
                        </p>
                      </div>
                    )}
                    <SiteVisitPhotoGrid
                      photos={photos}
                      onUpload={(files) => onUploadPhotos(siteVisit, files)}
                      onDelete={onDeletePhoto}
                      onSyncToArchive={onSyncPhotoToArchive}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <SiteVisitFormModal
          siteVisit={editing}
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
