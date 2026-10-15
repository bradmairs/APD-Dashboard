import { SuggestedAction } from "../types";
import { SuggestionDestination } from "../meetingActionRouting";

interface Props {
  suggestions: SuggestedAction[];
  selected: Set<number>;
  destinations: SuggestionDestination[];
  onToggleSelected: (index: number) => void;
  onChangeDestination: (index: number, destination: SuggestionDestination) => void;
}

export default function SuggestedActionList({
  suggestions,
  selected,
  destinations,
  onToggleSelected,
  onChangeDestination,
}: Props) {
  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Items assigned to you go to your project <strong>Tasks</strong>; everyone else's go to
        the <strong>Actions &amp; Decisions</strong> register. Change any before adding.
      </p>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={selected.has(i)}
            onChange={() => onToggleSelected(i)}
            aria-label={`Include "${s.title}"`}
            className="mt-0.5"
          />
          <span className="flex-1 min-w-0">
            <span className="text-slate-700 dark:text-slate-300">{s.title}</span>
            {(s.ownerName || s.dueDateHint) && (
              <span className="text-slate-400 dark:text-slate-500">
                {" "}
                ({[s.ownerName, s.dueDateHint].filter(Boolean).join(", ")})
              </span>
            )}
          </span>
          <select
            value={destinations[i]}
            onChange={(e) => onChangeDestination(i, e.target.value as SuggestionDestination)}
            aria-label={`Destination for "${s.title}"`}
            className="shrink-0 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1 py-0.5 text-xs"
          >
            <option value="TASK">My task</option>
            <option value="ACTION">Action</option>
          </select>
        </div>
      ))}
    </>
  );
}
