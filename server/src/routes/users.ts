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

// Every parent with their collection count (no money involved - parents aren't paid).
router.get("/parents", async (_req, res) => {
  const parents = await prisma.user.findMany({ where: { role: "PARENT" }, orderBy: { name: "asc" } });
  const withCounts = await Promise.all(
    parents.map(async (p) => ({
      userId: p.id,
      name: p.name,
      color: p.color,
      collectionsCount: await prisma.eggCollection.count({ where: { userId: p.id } }),
    }))
  );
  res.json(withCounts);
});

export default router;
