import { useEffect, useState } from "react";
import { getApprovals } from "../api";
import { ApprovalRequest } from "../types";

// Approvals for one project, shared by every row that shows an approval
// state (one request per project, refreshed after any change).
const cache = new Map<string, Promise<ApprovalRequest[]>>();
const EVENT = "apd:approvals-changed";

export function approvalsChanged(projectId?: string) {
  if (projectId) cache.delete(projectId);
  else cache.clear();
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { projectId } }));
}

export function useProjectApprovals(projectId: string | undefined) {
  const [list, setList] = useState<ApprovalRequest[]>([]);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const load = () => {
      if (!cache.has(projectId)) cache.set(projectId, getApprovals({ projectId }).catch(() => []));
      cache.get(projectId)!.then((rows) => active && setList(rows));
    };
    load();
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<{ projectId?: string }>).detail?.projectId;
      if (!id || id === projectId) load();
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      active = false;
      window.removeEventListener(EVENT, onChange);
    };
  }, [projectId]);
  return list;
}

// Pending approvals waiting on the signed-in user (for the menu badge).
export const MY_APPROVALS_EVENT = EVENT;
