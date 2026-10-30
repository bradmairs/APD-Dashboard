import { FormEvent, useState } from "react";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { ArchiveItemType, ArchiveLink, ArchiveSearchResult } from "../types";
import { searchArchive } from "../api";
import { formatDate } from "../format";

interface Props {
  links: ArchiveLink[];
  onCreate: (data: { archiveType: ArchiveItemType; archiveId: string; label: string }) => Promise<void>;
  onDelete: (link: ArchiveLink) => Promise<void>;
}

const TYPE_LABELS: Record<ArchiveItemType, string> = {
  ASSET: "Asset",
  MEDIA: "Photo/Video",
  FILE: "File",
};

export default function ArchiveLinksPanel({ links, onCreate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArchiveSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchArchive(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  async function handleLink(archiveType: ArchiveItemType, archiveId: string, label: string) {
    setLinkingId(archiveId);
    try {
      await onCreate({ archiveType, archiveId, label });
    } finally {
      setLinkingId(null);
    }
  }

  const alreadyLinked = new Set(links.map((l) => l.archiveId));

  const shown = useShowMore(links);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Engineering Archive
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Link assets, photos/videos, and files from the Engineering Archive to this project.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Archive…"
          className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2 mb-3">
          {error}
        </div>
      )}

      {results && (
        <div className="mb-4 space-y-3 max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded p-2">
          {results.assets.length === 0 && results.media.length === 0 && results.files.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-1">
              No results for "{results.query}".
            </p>
          ) : (
            <>
              <ResultSection
                title="Assets"
                items={results.assets.map((a) => ({ id: a.id, label: a.name, sub: a.description }))}
                type="ASSET"
                alreadyLinked={alreadyLinked}
                linkingId={linkingId}
                onLink={handleLink}
              />
              <ResultSection
                title="Photos & Videos"
                items={results.media.map((m) => ({ id: m.id, label: m.fileName, sub: m.locationName }))}
                type="MEDIA"
                alreadyLinked={alreadyLinked}
                linkingId={linkingId}
                onLink={handleLink}
              />
              <ResultSection
                title="Files"
                items={results.files.map((f) => ({ id: f.id, label: f.fileName, sub: f.category }))}
                type="FILE"
                alreadyLinked={alreadyLinked}
                linkingId={linkingId}
                onLink={handleLink}
              />
            </>
          )}
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No Engineering Archive items linked yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((link) => (
              <li key={link.id} className="py-2 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate block"
                  >
                    {link.label}
                  </a>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {TYPE_LABELS[link.archiveType]} · linked by {link.createdByName} on{" "}
                    {formatDate(link.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(link)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline ml-3 shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <ShowMoreButton state={shown} noun="links" />
        </>
      )}
    </div>
  );
}

function ResultSection({
  title,
  items,
  type,
  alreadyLinked,
  linkingId,
  onLink,
}: {
  title: string;
  items: { id: string; label: string; sub: string | null }[];
  type: ArchiveItemType;
  alreadyLinked: Set<string>;
  linkingId: string | null;
  onLink: (type: ArchiveItemType, id: string, label: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <div className="text-slate-900 dark:text-slate-100 truncate">{item.label}</div>
              {item.sub && (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.sub}</div>
              )}
            </div>
            {alreadyLinked.has(item.id) ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">Linked</span>
            ) : (
              <button
                onClick={() => onLink(type, item.id, item.label)}
                disabled={linkingId === item.id}
                className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 shrink-0"
              >
                {linkingId === item.id ? "Linking…" : "Link"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
