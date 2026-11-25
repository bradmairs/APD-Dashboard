import { Icon } from "./icons";

// What an empty list shows: an icon, the message, and (where the section
// has one) its Add button, instead of a bare grey line.
export default function EmptyState({
  text,
  icon = "inbox",
  addLabel,
  onAdd,
}: {
  text: string;
  icon?: string;
  addLabel?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-6">
      <span className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-300">
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{text}</p>
      {onAdd && addLabel && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
        >
          <Icon name="plus" className="w-4 h-4" />
          {addLabel}
        </button>
      )}
    </div>
  );
}
