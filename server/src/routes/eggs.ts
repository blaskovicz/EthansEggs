import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { computeChildBalance, todayLocalDate } from "../lib/balance";

const router = Router();
router.use(requireAuth);

function canView(req: any, targetUserId: string) {
  return req.user.role === "PARENT" || req.user.userId === targetUserId;
}

// Mark that the logged-in child collected/helped collect eggs today.
router.post("/collect", async (req, res) => {
  if (req.user!.role !== "CHILD") {
    return res.status(403).json({ error: "Only children mark egg collection" });
  }
  const date = todayLocalDate();
  const note = z.string().max(280).optional().safeParse(req.body?.note).data;

  try {
    const entry = await prisma.eggCollection.create({
      data: { userId: req.user!.userId, date, note: note || undefined },
    });
    res.status(201).json(entry);
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Already marked for today" });
    }
    throw e;
  }
});

// Undo today's mark (fixes accidental double-taps), self only.
router.delete("/collect/today", async (req, res) => {
  const date = todayLocalDate();
  await prisma.eggCollection.deleteMany({ where: { userId: req.user!.userId, date } });
  res.json({ ok: true });
});

router.get("/mine", async (req, res) => {
  const [balance, entries] = await Promise.all([
    computeChildBalance(req.user!.userId),
    prisma.eggCollection.findMany({
      where: { userId: req.user!.userId },
      orderBy: { date: "desc" },
    }),
  ]);
  res.json({ balance, entries, markedToday: entries.some((e) => e.date === todayLocalDate()) });
});

router.get("/user/:id", async (req, res) => {
  if (!canView(req, req.params.id)) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const [balance, entries] = await Promise.all([
    computeChildBalance(req.params.id),
    prisma.eggCollection.findMany({
      where: { userId: req.params.id },
      orderBy: { date: "desc" },
    }),
  ]);
  res.json({ balance, entries, markedToday: entries.some((e) => e.date === todayLocalDate()) });
});

export default router;
