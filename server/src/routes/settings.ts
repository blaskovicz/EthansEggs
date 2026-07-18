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
  res.json({ rate: settings.rateCents / 100 });
});

const updateSchema = z.object({ rate: z.number().positive() });

router.put("/", requireParent, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid rate" });
  }
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { rateCents: Math.round(parsed.data.rate * 100) },
    create: { id: 1, rateCents: Math.round(parsed.data.rate * 100) },
  });
  res.json({ rate: settings.rateCents / 100 });
});

export default router;
