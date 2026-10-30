import { useEffect, useMemo, useState } from "react";
import FormattedText from "../components/FormattedText";
import { Link } from "react-router-dom";
import { getAllLessonsLearned } from "../api";
import { LessonLearned, LessonType } from "../types";
import { ALL_LESSON_TYPES, LESSON_TYPE_COLORS, LESSON_TYPE_LABELS } from "../lessonMeta";
import UserMenu from "../components/UserMenu";
import GvwLogo from "../components/GvwLogo";

export default function LessonsLearnedPage() {
  const [lessons, setLessons] = useState<LessonLearned[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<LessonType | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllLessonsLearned()
      .then(setLessons)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load lessons learned")
      )
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const lesson of lessons) {
      if (lesson.category) set.add(lesson.category);
    }
    return Array.from(set).sort();
  }, [lessons]);

  const filtered = useMemo(() => {
    return lessons.filter((lesson) => {
      if (typeFilter !== "ALL" && lesson.type !== typeFilter) return false;
      if (categoryFilter !== "ALL" && lesson.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${lesson.title} ${lesson.description ?? ""} ${
          lesson.recommendation ?? ""
        } ${lesson.project?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [lessons, typeFilter, categoryFilter, search]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <Link
            to="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-y-3 mt-2">
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:opacity-90">
                <GvwLogo className="h-14" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Lessons Learned
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Searchable across every project in the portfolio
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                typeFilter === "ALL"
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
              }`}
            >
              All
            </button>
            {ALL_LESSON_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-sm rounded-full border ${
                  typeFilter === t
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                }`}
              >
                {LESSON_TYPE_LABELS[t]}
              </button>
            ))}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 text-sm"
              >
                <option value="ALL">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons, projects…"
            className="w-full sm:w-72 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            No lessons match the current filters.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((lesson) => (
              <li
                key={lesson.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4"
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
                  {lesson.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {lesson.category}
                    </span>
                  )}
                </div>

                {lesson.project && (
                  <Link
                    to={`/projects/${lesson.project.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                  >
                    {lesson.project.name}
                    {lesson.project.assetType && ` · ${lesson.project.assetType}`}
                  </Link>
                )}

                {lesson.description && (
                  <FormattedText className="text-sm text-slate-700 dark:text-slate-300 mt-2" text={lesson.description} />
                )}
                {lesson.recommendation && (
                  <div className="mt-2 text-sm">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Recommendation:{" "}
                    </span>
                    <FormattedText className="text-slate-700 dark:text-slate-300" text={lesson.recommendation} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
