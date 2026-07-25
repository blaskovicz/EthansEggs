import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireParent } from "../middleware/auth";
import { computeChildBalance, getChickenCount, getRateCents, todayLocalDate } from "../lib/balance";

const router = Router();
router.use(requireAuth);

function canView(req: any, targetUserId: string) {
  return req.user.role === "PARENT" || req.user.userId === targetUserId;
}

const collectSchema = z.object({
  eggCount: z.number().int().positive().max(500).optional(),
  helperIds: z.array(z.string().min(1)).max(20).optional(),
});

// Mark that the logged-in user (child or parent) collected/helped collect eggs today.
// Only one person can *start* today's collection - whoever gets there first (a child,
// who may name helpers in the same request, or a parent) locks it for everyone else
// for the rest of the day. This keeps "today's collection" a single coordinated event
// instead of multiple people independently claiming the same day. Parent-recorded
// entries don't generate any payout (parents aren't paid) - they exist purely so the
// household can see the chore is done.
router.post("/collect", async (req, res) => {
  const parsed = collectSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { eggCount, helperIds } = parsed.data;
  const date = todayLocalDate();

  if (eggCount !== undefined) {
    const chickenCount = await getChickenCount();
    if (eggCount > chickenCount) {
      return res.status(400).json({ error: `Egg count can't be more than the ${chickenCount} chickens you have` });
    }
  }

  const alreadyMarked = await prisma.eggCollection.findFirst({
    where: { date },
    include: { user: { select: { name: true, role: true } } },
  });
  if (alreadyMarked) {
    const who =
      alreadyMarked.user.role === "PARENT" ? `${alreadyMarked.user.name} (a parent)` : alreadyMarked.user.name;
    return res.status(403).json({ error: `${who} already marked eggs collected today` });
  }

  // Snapshot the rate at the moment of collection, so a rate change later doesn't
  // retroactively reprice this (or anyone else's) past collections.
  const rateCents = await getRateCents();

  let entry;
  try {
    entry = await prisma.eggCollection.create({
      data: { userId: req.user!.userId, date, eggCount, isHelper: false, rateCents },
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Already marked for today" });
    }
    throw e;
  }

  const helperEntries = [];
  if (req.user!.role === "CHILD" && helperIds?.length) {
    const helperIdSet = [...new Set(helperIds)].filter((id) => id !== req.user!.userId);
    const helpers = await prisma.user.findMany({
      where: { id: { in: helperIdSet }, role: "CHILD" },
    });
    for (const helper of helpers) {
      try {
        const helperEntry = await prisma.eggCollection.create({
          data: { userId: helper.id, date, eggCount, isHelper: true, rateCents },
        });
        helperEntries.push(helperEntry);
      } catch (e: any) {
        if (e.code !== "P2002") throw e; // already marked today - skip silently
      }
    }
  }

  res.status(201).json({ entry, helperEntries });
});

// Undo today's mark (fixes accidental double-taps), self only. If this user was the one
// who started today's collection (isHelper: false), also remove any helper entries they
// marked in the same request - otherwise those rows would be left with no initiator.
router.delete("/collect/today", async (req, res) => {
  const date = todayLocalDate();
  const myEntry = await prisma.eggCollection.findUnique({
    where: { userId_date: { userId: req.user!.userId, date } },
  });
  if (myEntry && !myEntry.isHelper) {
    await prisma.eggCollection.deleteMany({ where: { date } });
  } else {
    await prisma.eggCollection.deleteMany({ where: { userId: req.user!.userId, date } });
  }
  res.json({ ok: true });
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const manualEntrySchema = z.object({
  userId: z.string().min(1),
  date: dateSchema,
  eggCount: z.number().int().positive().max(500).optional(),
});

// Parents can retroactively add a collection a child forgot to mark - e.g. logging
// eggs for a past date that has no entry yet. Unlike POST /collect, this is scoped
// to one child/date pair and doesn't lock out the rest of the household, since it's
// a correction to the record rather than coordinating today's chore in real time.
router.post("/manual", requireParent, async (req, res) => {
  const parsed = manualEntrySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { userId, date, eggCount } = parsed.data;

  if (date > todayLocalDate()) {
    return res.status(400).json({ error: "Date can't be in the future" });
  }

  const child = await prisma.user.findUnique({ where: { id: userId } });
  if (!child || child.role !== "CHILD") {
    return res.status(404).json({ error: "Child not found" });
  }

  if (eggCount !== undefined) {
    const chickenCount = await getChickenCount();
    if (eggCount > chickenCount) {
      return res.status(400).json({ error: `Egg count can't be more than the ${chickenCount} chickens you have` });
    }
  }

  const rateCents = await getRateCents();
  try {
    const entry = await prisma.eggCollection.create({
      data: { userId, date, eggCount, isHelper: false, rateCents },
    });
    res.status(201).json(entry);
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "That day already has an entry - edit it instead" });
    }
    throw e;
  }
});

const editEntrySchema = z.object({
  eggCount: z.number().int().min(0).max(500).nullable(),
});

// Parents can correct the egg count on any existing entry (any date, any user).
router.patch("/:id", requireParent, async (req, res) => {
  const parsed = editEntrySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const existing = await prisma.eggCollection.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }

  if (parsed.data.eggCount !== null) {
    const chickenCount = await getChickenCount();
    if (parsed.data.eggCount > chickenCount) {
      return res.status(400).json({ error: `Egg count can't be more than the ${chickenCount} chickens you have` });
    }
  }

  const entry = await prisma.eggCollection.update({
    where: { id: req.params.id },
    data: { eggCount: parsed.data.eggCount },
  });
  res.json(entry);
});

// Parents can cancel any collection entry - a correction tool alongside the
// self-only DELETE /collect/today, not a replacement for it.
router.delete("/:id", requireParent, async (req, res) => {
  await prisma.eggCollection.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

// Visible to any logged-in user: who has (or hasn't) collected/helped today, and how
// many eggs, so the whole household can coordinate without needing to log in as
// a specific person.
router.get("/today", async (_req, res) => {
  const date = todayLocalDate();
  const entries = await prisma.eggCollection.findMany({
    where: { date },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, role: true, color: true } } },
  });
  res.json(entries);
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
