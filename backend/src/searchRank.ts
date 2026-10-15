export interface RankableResult {
  type: string;
  title: string;
  subtitle: string | null;
  date: Date | null;
}

// Higher is a closer match. A hit in the title beats a hit in the subtitle,
// which beats a match that only came from a field the result doesn't show
// (description, notes, etc.).
export function relevanceScore(result: RankableResult, query: string): number {
  const q = query.trim().toLowerCase();
  const title = result.title.toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.split(/[\s\-_/()]+/).some((word) => word.startsWith(q))) return 60;
  if (title.includes(q)) return 40;
  if (result.subtitle?.toLowerCase().includes(q)) return 20;
  return 10;
}

// Ranks within each register, keeps at most `perType` per register, and
// orders the registers themselves by their best hit so the closest match
// overall surfaces first. Ties fall back to most recent.
export function rankResults<T extends RankableResult>(results: T[], query: string, perType: number): T[] {
  const scored = results.map((result) => ({ result, score: relevanceScore(result, query) }));
  const byType = new Map<string, typeof scored>();
  for (const entry of scored) {
    const list = byType.get(entry.result.type);
    if (list) list.push(entry);
    else byType.set(entry.result.type, [entry]);
  }
  const time = (d: Date | null) => (d ? new Date(d).getTime() : 0);
  const groups = Array.from(byType.values()).map((list) => {
    list.sort((a, b) => b.score - a.score || time(b.result.date) - time(a.result.date));
    return list.slice(0, perType);
  });
  groups.sort((a, b) => b[0].score - a[0].score);
  return groups.flat().map((entry) => entry.result);
}
