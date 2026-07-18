import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireParent } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, rateCents: 100 },
  });
  res.json({ rate: settings.rateCents / 100, chickenCount: settings.chickenCount });
});

const updateSchema = z.object({
  rate: z.number().positive().optional(),
  chickenCount: z.number().int().positive().max(1000).optional(),
});

router.put("/", requireParent, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid settings" });
  }
  const { rate, chickenCount } = parsed.data;
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(rate !== undefined ? { rateCents: Math.round(rate * 100) } : {}),
      ...(chickenCount !== undefined ? { chickenCount } : {}),
    },
    create: {
      id: 1,
      rateCents: rate !== undefined ? Math.round(rate * 100) : 100,
      chickenCount: chickenCount ?? 30,
    },
  });
  res.json({ rate: settings.rateCents / 100, chickenCount: settings.chickenCount });
});

export default router;
