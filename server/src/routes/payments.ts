import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireParent } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const createPaymentSchema = z.object({
  childId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().max(280).optional(),
});

// Parents record a true-up payment made to a child.
router.post("/", requireParent, async (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { childId, amount, note } = parsed.data;

  const child = await prisma.user.findUnique({ where: { id: childId } });
  if (!child || child.role !== "CHILD") {
    return res.status(404).json({ error: "Child not found" });
  }

  const payment = await prisma.payment.create({
    data: {
      childId,
      amountCents: Math.round(amount * 100),
      note,
      recordedById: req.user!.userId,
    },
  });
  res.status(201).json(payment);
});

router.get("/user/:id", async (req, res) => {
  if (req.user!.role !== "PARENT" && req.user!.userId !== req.params.id) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const payments = await prisma.payment.findMany({
    where: { childId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { recordedBy: { select: { name: true } } },
  });
  res.json(payments);
});

// Parents can delete a mistaken payment entry.
router.delete("/:id", requireParent, async (req, res) => {
  await prisma.payment.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

export default router;
