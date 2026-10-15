import { useState } from "react";
import { LessonLearned, LessonLearnedInput } from "../types";
import { LESSON_TYPE_COLORS, LESSON_TYPE_LABELS } from "../lessonMeta";
import LessonLearnedFormModal from "./LessonLearnedFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  lessons: LessonLearned[];
  onCreate: (data: Partial<LessonLearnedInput>) => Promise<void>;
  onUpdate: (lesson: LessonLearned, data: Partial<LessonLearnedInput>) => Promise<void>;
  onDelete: (lesson: LessonLearned) => Promise<void>;
}

export default function LessonsLearnedPanel({
  lessons,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LessonLearned | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(lesson: LessonLearned) {
    setEditing(lesson);
    setShowModal(true);
  }

  async function handleSave(data: Partial<LessonLearnedInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(lesson: LessonLearned) {
    if (!await confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return;
    await onDelete(lesson);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Lessons Learned
        </h2>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="lessons-learned" rows={lessons} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Lesson
          </button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No lessons logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {lessons.map((lesson) => {
            const isExpanded = expandedId === lesson.id;
            return (
              <li key={lesson.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${LESSON_TYPE_COLORS[lesson.type]}`}
                      >
                        {LESSON_TYPE_LABELS[lesson.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {lesson.title}
                      </span>
                    </div>
                    {lesson.category && (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {lesson.category}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(lesson)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(lesson)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (lesson.description || lesson.recommendation) && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {lesson.description && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          What happened
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {lesson.description}
                        </p>
                      </div>
                    )}
                    {lesson.recommendation && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Recommendation
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {lesson.recommendation}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Logged by {lesson.createdByName}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <LessonLearnedFormModal
          lesson={editing}
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
