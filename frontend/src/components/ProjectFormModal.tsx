import { FormEvent, useEffect, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Project, ProjectInput, ProjectStatus, TaskTemplate, UserOption } from "../types";
import { ALL_STATUSES, STATUS_LABELS } from "../statusMeta";
import { getUserOptions } from "../api";
import { useAuth } from "../auth/AuthContext";
import DateInput from "./DateInput";
import { getTaskTemplates } from "../api";

// Select value for a project whose manager was typed in before managers were
// picked from the user list and doesn't match a user — leaving it selected
// keeps that name as it is.
const UNLINKED_MANAGER = "__unlinked__";

interface Props {
  project: Project | null;
  onClose: () => void;
  // extras.templateId: a task template to set a new project up with.
  onSave: (data: Partial<ProjectInput>, extras?: { templateId?: string }) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.substring(0, 10);
}

export default function ProjectFormModal({ project, onClose, onSave }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [assetType, setAssetType] = useState(project?.assetType ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "PLANNING"
  );
  const [projectNumber, setProjectNumber] = useState(project?.projectNumber ?? "");
  const [bpRefNo, setBpRefNo] = useState(project?.bpRefNo ?? "");
  // A new project defaults to whoever is creating it.
  const [projectManagerId, setProjectManagerId] = useState(
    project
      ? project.projectManagerId ?? (project.projectManager ? UNLINKED_MANAGER : "")
      : user?.id ?? ""
  );
  const [userOptions, setUserOptions] = useState<UserOption[] | null>(null);
  const [projectDirector, setProjectDirector] = useState(
    project?.projectDirector ?? ""
  );
  const [projectSponsor, setProjectSponsor] = useState(
    project?.projectSponsor ?? ""
  );
  const [location, setLocation] = useState(project?.location ?? "");
  const [contractor, setContractor] = useState(project?.contractor ?? "");
  const [consultant, setConsultant] = useState(project?.consultant ?? "");
  const [trimFolder, setTrimFolder] = useState(project?.trimFolder ?? "");
  const [budget, setBudget] = useState(project?.budget ?? "");
  const [contingency, setContingency] = useState(project?.contingency ?? "");
  // New projects can start from a template (tasks + milestones), offered
  // first where the template's asset type matches.
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateTouched, setTemplateTouched] = useState(false);
  useEffect(() => {
    if (project) return;
    getTaskTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, [project]);
  const matchingTemplates = templates.filter(
    (t) => !t.assetType || !assetType || t.assetType.toLowerCase() === assetType.trim().toLowerCase()
  );
  useEffect(() => {
    if (project || templateTouched) return;
    const match = templates.find((t) => t.assetType && assetType && t.assetType.toLowerCase() === assetType.trim().toLowerCase());
    setTemplateId(match?.id ?? "");
  }, [assetType, templates, project, templateTouched]);
  const [latestApprovedBudget, setLatestApprovedBudget] = useState(
    project?.latestApprovedBudget ?? ""
  );
  const [startDate, setStartDate] = useState(
    toDateInputValue(project?.startDate ?? null)
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    toDateInputValue(project?.targetCompletionDate ?? null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserOptions()
      .then(setUserOptions)
      .catch(() => setError("Failed to load the user list for Project Manager"));
  }, []);

  // A linked manager whose account has since been deactivated isn't in the
  // active-user list, but should still show as the current selection.
  const linkedManagerMissing =
    !!userOptions &&
    !!project?.projectManagerId &&
    projectManagerId === project.projectManagerId &&
    !userOptions.some((u) => u.id === project.projectManagerId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name,
        description: description || null,
        assetType: assetType || null,
        status,
        projectNumber: projectNumber.trim() || null,
        bpRefNo: bpRefNo || null,
        // Leaving an unlinked legacy name (or an unchanged deactivated
        // manager) selected sends nothing, so the server keeps it as is.
        ...(projectManagerId === UNLINKED_MANAGER || linkedManagerMissing
          ? {}
          : { projectManagerId: projectManagerId || null }),
        projectDirector: projectDirector || null,
        projectSponsor: projectSponsor || null,
        location: location || null,
        contractor: contractor || null,
        consultant: consultant.trim() || null,
        trimFolder: trimFolder.trim() || null,
        budget: budget ? String(budget) : null,
        latestApprovedBudget: latestApprovedBudget
          ? String(latestApprovedBudget)
          : null,
        contingency: contingency ? String(contingency) : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        targetCompletionDate: targetCompletionDate
          ? new Date(targetCompletionDate).toISOString()
          : null,
      }, templateId ? { templateId } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex justify-end z-50 animate-fade-in">
      <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-900 shadow-xl w-full max-w-2xl h-full overflow-y-auto animate-slide-in-right border-l border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {project ? "Edit Project" : "New Project"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <RichTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Asset Type
              </label>
              <input
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                placeholder="e.g. Pipeline, Pump Station"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Number
              </label>
              <input
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                BP Ref. No.
              </label>
              <input
                value={bpRefNo}
                onChange={(e) => setBpRefNo(e.target.value)}
                placeholder="e.g. 3323"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                TRIM Folder
              </label>
              <input
                value={trimFolder}
                onChange={(e) => setTrimFolder(e.target.value)}
                placeholder="Container number or link"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Manager
              </label>
              <select
                value={projectManagerId}
                onChange={(e) => setProjectManagerId(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {project?.projectManager && !project.projectManagerId && (
                  <option value={UNLINKED_MANAGER}>
                    {project.projectManager} (not a user)
                  </option>
                )}
                {linkedManagerMissing && (
                  <option value={project!.projectManagerId!}>
                    {project!.projectManager} (inactive)
                  </option>
                )}
                {userOptions === null && projectManagerId && projectManagerId !== UNLINKED_MANAGER && (
                  <option value={projectManagerId}>
                    {project?.projectManager ?? user?.name ?? "Loading…"}
                  </option>
                )}
                {userOptions?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {projectManagerId === UNLINKED_MANAGER && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Pick a user so they get this project's notifications.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Director
              </label>
              <input
                value={projectDirector}
                onChange={(e) => setProjectDirector(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Sponsor
              </label>
              <input
                value={projectSponsor}
                onChange={(e) => setProjectSponsor(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contractor
              </label>
              <input
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Consultant
              </label>
              <input
                value={consultant}
                onChange={(e) => setConsultant(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Original Budget ($, Excl. GST)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Latest Approved Budget ($, Excl. GST)
              </label>
              <input
                type="number"
                value={latestApprovedBudget}
                onChange={(e) => setLatestApprovedBudget(e.target.value)}
                placeholder="Leave blank if unchanged from original"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contingency ($, Excl. GST)
              </label>
              <input
                type="number"
                value={contingency}
                onChange={(e) => setContingency(e.target.value)}
                placeholder="Optional — or set on contracts"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            {!project && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start from a template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    setTemplateTouched(true);
                  }}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                >
                  <option value="">No template</option>
                  {matchingTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.assetType ? ` (${t.assetType})` : ""} — {t.items.length} tasks
                      {t.milestones?.length ? `, ${t.milestones.length} milestones` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Approved Completion Target
              </label>
              <DateInput
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
