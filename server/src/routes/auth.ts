import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { issueSessionCookie, clearSessionCookie, requireAuth } from "../middleware/auth";

const router = Router();

// Public: list of profiles to choose from (no sensitive data).
router.get("/profiles", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, color: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  res.json(users);
});

const loginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing profile or password" });
  }
  const { userId, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(401).json({ error: "Unknown profile" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  issueSessionCookie(res, { userId: user.id, role: user.role, name: user.name });
  res.json({ id: user.id, name: user.name, role: user.role, color: user.color });
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, role: true, color: true },
  });
  if (!user) return res.status(401).json({ error: "Not logged in" });
  res.json(user);
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

router.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ ok: true });
});

export default router;
