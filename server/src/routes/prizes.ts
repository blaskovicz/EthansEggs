import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireParent } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Visible to everyone (kids need to see the shop) - the persistent catalog parents maintain.
router.get("/", async (_req, res) => {
  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: "asc" } });
  res.json(prizes);
});

const createPrizeSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().positive(),
  icon: z.string().min(1).max(8),
});

router.post("/", requireParent, async (req, res) => {
  const parsed = createPrizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { name, price, icon } = parsed.data;
  const prize = await prisma.prize.create({
    data: { name, priceCents: Math.round(price * 100), icon },
  });
  res.status(201).json(prize);
});

// Deleting a catalog prize doesn't touch past awards - PrizeAward snapshots its
// own name/price/icon, and its prizeId just gets set null (see schema onDelete).
router.delete("/:id", requireParent, async (req, res) => {
  await prisma.prize.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

const awardSchema = z.object({
  childId: z.string().min(1),
});

// Parents assign a prize to a child, snapshotting the catalog's current
// name/price/icon onto the award and immediately deducting from the child's balance.
router.post("/:id/award", requireParent, async (req, res) => {
  const parsed = awardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { childId } = parsed.data;

  const [prize, child] = await Promise.all([
    prisma.prize.findUnique({ where: { id: req.params.id } }),
    prisma.user.findUnique({ where: { id: childId } }),
  ]);
  if (!prize) return res.status(404).json({ error: "Prize not found" });
  if (!child || child.role !== "CHILD") return res.status(404).json({ error: "Child not found" });

  const award = await prisma.prizeAward.create({
    data: {
      childId,
      prizeId: prize.id,
      name: prize.name,
      priceCents: prize.priceCents,
      icon: prize.icon,
      awardedById: req.user!.userId,
    },
  });
  res.status(201).json(award);
});

router.get("/awards/user/:id", async (req, res) => {
  if (req.user!.role !== "PARENT" && req.user!.userId !== req.params.id) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const awards = await prisma.prizeAward.findMany({
    where: { childId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { awardedBy: { select: { name: true } } },
  });
  res.json(awards);
});

// Parents can cancel (refund) a mistaken award.
router.delete("/awards/:id", requireParent, async (req, res) => {
  await prisma.prizeAward.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

export default router;
