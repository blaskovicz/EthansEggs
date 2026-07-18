import { prisma } from "../db";

export async function getRateCents(): Promise<number> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.rateCents ?? 100;
}

export async function getChickenCount(): Promise<number> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.chickenCount ?? 30;
}

export interface ChildBalance {
  userId: string;
  name: string;
  color: string;
  collectionsCount: number;
  rateCents: number;
  totalOwedCents: number;
  totalPaidCents: number;
  balanceCents: number;
}

export async function computeChildBalance(userId: string): Promise<ChildBalance> {
  const [user, collectionsCount, payments, rateCents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.eggCollection.count({ where: { userId } }),
    prisma.payment.aggregate({ where: { childId: userId }, _sum: { amountCents: true } }),
    getRateCents(),
  ]);

  const totalOwedCents = collectionsCount * rateCents;
  const totalPaidCents = payments._sum.amountCents ?? 0;

  return {
    userId,
    name: user.name,
    color: user.color,
    collectionsCount,
    rateCents,
    totalOwedCents,
    totalPaidCents,
    balanceCents: totalOwedCents - totalPaidCents,
  };
}

export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
