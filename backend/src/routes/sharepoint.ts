import { Router } from "express";
import { prisma } from "../prisma";
import {
  SharePointError,
  disconnect,
  pollDeviceCode,
  sharePointConfig,
  startDeviceCode,
  usesAppAuth,
} from "../sharepoint";

// Whether SharePoint sync is available, and the signed-in user's Microsoft
// connection (delegated mode — see backend/src/sharepoint.ts).
const router = Router();

router.get("/status", async (req, res) => {
  const cfg = sharePointConfig();
  if (!cfg) return res.json({ configured: false, mode: null, connected: false, account: null, folderUrl: null });
  if (usesAppAuth(cfg)) {
    return res.json({ configured: true, mode: "app", connected: true, account: null, folderUrl: cfg.folderUrl });
  }
  const conn = await prisma.sharePointConnection.findUnique({ where: { userId: req.user!.sub } });
  res.json({
    configured: true,
    mode: "user",
    connected: !!conn,
    account: conn?.accountName ?? null,
    folderUrl: cfg.folderUrl,
  });
});

router.post("/connect", async (req, res) => {
  try {
    res.json(await startDeviceCode(req.user!.sub));
  } catch (err) {
    const e = err as SharePointError;
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post("/connect/poll", async (req, res) => {
  try {
    res.json({ status: await pollDeviceCode(req.user!.sub) });
  } catch (err) {
    const e = err as SharePointError;
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete("/connection", async (req, res) => {
  await disconnect(req.user!.sub);
  res.status(204).send();
});

export default router;
