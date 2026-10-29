import crypto from "crypto";
import { prisma } from "./prisma";

// SharePoint access for the monthly report workbooks, through Microsoft
// Graph. Two ways to authenticate, picked by configuration:
//
// - App-only (MS_CLIENT_SECRET set): the server signs in as the app
//   registration itself (client credentials). Needs an admin to grant the
//   app Sites.Selected (or Sites.ReadWrite.All) on the APD site.
// - Delegated (no secret): each user signs in with their own Microsoft
//   account through the device-code flow — they open microsoft.com/devicelogin,
//   enter a short code and approve. Files are then read and written with
//   that user's own SharePoint permissions. Their refresh token is stored
//   encrypted (AES-256-GCM, key derived from JWT_SECRET).
//
// Settings: MS_TENANT_ID, MS_CLIENT_ID, optional MS_CLIENT_SECRET, and
// SHAREPOINT_REPORTS_FOLDER_URL (a link to the "Project Monthly Reports"
// folder — a browser sharing link works).

const GRAPH = "https://graph.microsoft.com/v1.0";
const DELEGATED_SCOPES = "offline_access Files.ReadWrite.All Sites.ReadWrite.All";

export class SharePointError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string | null;
  folderUrl: string;
}

export const DEFAULT_FOLDER_URL =
  "https://gvwater.sharepoint.com/sites/apd/Shared Documents/Project Monthly Reports";

export function sharePointConfig(): SharePointConfig | null {
  const tenantId = process.env.MS_TENANT_ID?.trim();
  const clientId = process.env.MS_CLIENT_ID?.trim();
  if (!tenantId || !clientId) return null;
  return {
    tenantId,
    clientId,
    clientSecret: process.env.MS_CLIENT_SECRET?.trim() || null,
    folderUrl: process.env.SHAREPOINT_REPORTS_FOLDER_URL?.trim() || DEFAULT_FOLDER_URL,
  };
}

// ---- Token storage -----------------------------------------------------------

function key(): Buffer {
  return crypto.createHash("sha256").update(`${process.env.JWT_SECRET}:sharepoint`).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(cfg: SharePointConfig, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, ...body }),
  });
  return (await res.json()) as TokenResponse;
}

let appToken: { token: string; expires: number } | null = null;

async function appAccessToken(cfg: SharePointConfig): Promise<string> {
  if (appToken && appToken.expires > Date.now() + 60_000) return appToken.token;
  const t = await tokenRequest(cfg, {
    grant_type: "client_credentials",
    client_secret: cfg.clientSecret!,
    scope: "https://graph.microsoft.com/.default",
  });
  if (!t.access_token) {
    throw new SharePointError(`Microsoft sign-in failed: ${t.error_description || t.error || "no token"}`);
  }
  appToken = { token: t.access_token, expires: Date.now() + t.expires_in * 1000 };
  return t.access_token;
}

const userTokens = new Map<string, { token: string; expires: number }>();

async function userAccessToken(cfg: SharePointConfig, userId: string): Promise<string> {
  const cached = userTokens.get(userId);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const conn = await prisma.sharePointConnection.findUnique({ where: { userId } });
  if (!conn) throw new SharePointError("Connect your Microsoft account to SharePoint first.", 401);
  const t = await tokenRequest(cfg, {
    grant_type: "refresh_token",
    refresh_token: decrypt(conn.refreshToken),
    scope: DELEGATED_SCOPES,
    ...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {}),
  });
  if (!t.access_token) {
    await prisma.sharePointConnection.delete({ where: { userId } }).catch(() => undefined);
    throw new SharePointError("Your Microsoft sign-in has expired. Connect SharePoint again.", 401);
  }
  if (t.refresh_token) {
    await prisma.sharePointConnection.update({
      where: { userId },
      data: { refreshToken: encrypt(t.refresh_token) },
    });
  }
  userTokens.set(userId, { token: t.access_token, expires: Date.now() + t.expires_in * 1000 });
  return t.access_token;
}

export function usesAppAuth(cfg: SharePointConfig): boolean {
  return !!cfg.clientSecret;
}

async function accessToken(userId: string): Promise<string> {
  const cfg = sharePointConfig();
  if (!cfg) throw new SharePointError("SharePoint isn't set up on this server.", 503);
  return usesAppAuth(cfg) ? appAccessToken(cfg) : userAccessToken(cfg, userId);
}

// ---- Device-code sign-in (delegated mode) -------------------------------------

interface PendingDeviceCode {
  deviceCode: string;
  interval: number;
  expires: number;
}

const pending = new Map<string, PendingDeviceCode>();

export async function startDeviceCode(userId: string) {
  const cfg = sharePointConfig();
  if (!cfg) throw new SharePointError("SharePoint isn't set up on this server.", 503);
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/devicecode`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, scope: DELEGATED_SCOPES }),
  });
  const body = (await res.json()) as {
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
    message?: string;
    error_description?: string;
  };
  if (!body.device_code || !body.user_code) {
    throw new SharePointError(`Microsoft sign-in couldn't start: ${body.error_description || "unknown error"}`);
  }
  pending.set(userId, {
    deviceCode: body.device_code,
    interval: body.interval ?? 5,
    expires: Date.now() + (body.expires_in ?? 900) * 1000,
  });
  return {
    userCode: body.user_code,
    verificationUri: body.verification_uri ?? "https://microsoft.com/devicelogin",
    expiresIn: body.expires_in ?? 900,
    interval: body.interval ?? 5,
  };
}

export async function pollDeviceCode(userId: string): Promise<"pending" | "connected" | "expired"> {
  const cfg = sharePointConfig();
  const p = pending.get(userId);
  if (!cfg || !p) return "expired";
  if (p.expires < Date.now()) {
    pending.delete(userId);
    return "expired";
  }
  const t = await tokenRequest(cfg, {
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    device_code: p.deviceCode,
  });
  if (t.error === "authorization_pending" || t.error === "slow_down") return "pending";
  pending.delete(userId);
  if (!t.access_token || !t.refresh_token) {
    throw new SharePointError(`Microsoft sign-in failed: ${t.error_description || t.error || "no token"}`, 400);
  }
  const me = await fetch(`${GRAPH}/me?$select=displayName,userPrincipalName`, {
    headers: { Authorization: `Bearer ${t.access_token}` },
  }).then((r) => r.json() as Promise<{ displayName?: string; userPrincipalName?: string }>).catch(() => ({} as { displayName?: string; userPrincipalName?: string }));
  const accountName = me.userPrincipalName || me.displayName || "Microsoft account";
  await prisma.sharePointConnection.upsert({
    where: { userId },
    create: { userId, refreshToken: encrypt(t.refresh_token), accountName },
    update: { refreshToken: encrypt(t.refresh_token), accountName },
  });
  userTokens.set(userId, { token: t.access_token, expires: Date.now() + t.expires_in * 1000 });
  return "connected";
}

export async function disconnect(userId: string) {
  userTokens.delete(userId);
  pending.delete(userId);
  await prisma.sharePointConnection.deleteMany({ where: { userId } });
}

// ---- Files ----------------------------------------------------------------------

export interface DriveFile {
  driveId: string;
  itemId: string;
  name: string;
  webUrl: string;
  eTag: string;
  lastModified: string;
  folder: string | null;
}

async function graph(userId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken(userId);
  const res = await fetch(path.startsWith("http") ? path : `${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (res.ok) return res;
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
  const msg = body.error?.message || res.statusText;
  if (res.status === 401) throw new SharePointError(`SharePoint rejected the sign-in: ${msg}`, 401);
  if (res.status === 403) throw new SharePointError(`No permission for that SharePoint file or folder: ${msg}`, 403);
  if (res.status === 404) throw new SharePointError(`SharePoint couldn't find it: ${msg}`, 404);
  if (res.status === 412) throw new SharePointError("The workbook changed in SharePoint while syncing. Pull the latest and try again.", 409);
  if (res.status === 423) throw new SharePointError("The workbook is locked (open in desktop Excel?). Close it and try again.", 423);
  throw new SharePointError(`SharePoint error ${res.status}: ${msg}`);
}

// Graph's /shares endpoint takes any SharePoint URL the user can open —
// sharing links and plain folder URLs alike — encoded as "u!" + base64url.
export function shareId(url: string): string {
  return "u!" + Buffer.from(url, "utf8").toString("base64").replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
}

interface GraphItem {
  id: string;
  name: string;
  webUrl: string;
  eTag: string;
  lastModifiedDateTime: string;
  folder?: unknown;
  file?: unknown;
  parentReference?: { driveId?: string };
}

async function resolveFolder(userId: string, url: string): Promise<{ driveId: string; itemId: string }> {
  const res = await graph(userId, `/shares/${shareId(url)}/driveItem?$select=id,name,parentReference,folder`);
  const item = (await res.json()) as GraphItem;
  if (!item.folder || !item.parentReference?.driveId) {
    throw new SharePointError("SHAREPOINT_REPORTS_FOLDER_URL doesn't point at a folder.", 400);
  }
  return { driveId: item.parentReference.driveId, itemId: item.id };
}

const WORKBOOK_RE = /\.xls[xm]$/i;

// Workbooks in the reports folder and one level of subfolders below it.
export async function listReportFiles(userId: string): Promise<DriveFile[]> {
  const cfg = sharePointConfig();
  if (!cfg) throw new SharePointError("SharePoint isn't set up on this server.", 503);
  const folder = await resolveFolder(userId, cfg.folderUrl);
  const select = "$select=id,name,webUrl,eTag,lastModifiedDateTime,folder,file&$top=999";
  const children = async (itemId: string) =>
    ((await (await graph(userId, `/drives/${folder.driveId}/items/${itemId}/children?${select}`)).json()) as { value: GraphItem[] }).value;
  const top = await children(folder.itemId);
  const out: DriveFile[] = [];
  const toFile = (i: GraphItem, folderName: string | null): DriveFile => ({
    driveId: folder.driveId,
    itemId: i.id,
    name: i.name,
    webUrl: i.webUrl,
    eTag: i.eTag,
    lastModified: i.lastModifiedDateTime,
    folder: folderName,
  });
  for (const i of top) if (i.file && WORKBOOK_RE.test(i.name)) out.push(toFile(i, null));
  for (const sub of top.filter((i) => i.folder)) {
    for (const i of await children(sub.id)) if (i.file && WORKBOOK_RE.test(i.name)) out.push(toFile(i, sub.name));
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function downloadFile(userId: string, driveId: string, itemId: string) {
  const meta = (await (await graph(userId, `/drives/${driveId}/items/${itemId}?$select=id,name,eTag,webUrl`)).json()) as GraphItem;
  const res = await graph(userId, `/drives/${driveId}/items/${itemId}/content`);
  return { buffer: Buffer.from(await res.arrayBuffer()), eTag: meta.eTag, name: meta.name, webUrl: meta.webUrl };
}

// If-Match makes the upload fail (412) rather than overwrite edits someone
// saved to the workbook between our download and this upload.
export async function uploadFile(userId: string, driveId: string, itemId: string, buffer: Buffer, eTag: string) {
  const res = await graph(userId, `/drives/${driveId}/items/${itemId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/vnd.ms-excel.sheet.macroEnabled.12", "If-Match": eTag },
    body: buffer,
  });
  return (await res.json()) as GraphItem;
}

// Best guess at which workbook in the folder belongs to a project: its
// project number or BP ref in the file name, then shared name words.
export function matchScore(fileName: string, p: { name: string; projectNumber: string | null; bpRefNo: string | null }): number {
  const name = fileName.toLowerCase();
  let score = 0;
  for (const id of [p.projectNumber, p.bpRefNo]) {
    for (const part of (id ?? "").split(/[^0-9a-z]+/i).filter((s) => s.length >= 3)) {
      if (new RegExp(`(^|[^0-9a-z])${part.toLowerCase()}([^0-9a-z]|$)`).test(name)) score += 10;
    }
  }
  const words = p.name.toLowerCase().split(/[^0-9a-z]+/).filter((w) => w.length >= 4);
  score += words.filter((w) => name.includes(w)).length;
  return score;
}
