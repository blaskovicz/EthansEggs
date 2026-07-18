import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireParent } from "../middleware/auth";
import { computeChildBalance } from "../lib/balance";

const router = Router();
router.use(requireAuth, requireParent);

// Parent overview: every child with their current balance summary.
router.get("/children", async (_req, res) => {
  const children = await prisma.user.findMany({ where: { role: "CHILD" }, orderBy: { name: "asc" } });
  const balances = await Promise.all(children.map((c) => computeChildBalance(c.id)));
  res.json(balances);
});

export default router;
