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
  totalPrizesCents: number;
  balanceCents: number;
}

export async function computeChildBalance(userId: string): Promise<ChildBalance> {
  const [user, collectionsAgg, payments, prizeAwards, rateCents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    // Sum each collection's own snapshotted rate rather than count * current rate,
    // so a later rate change doesn't retroactively reprice past collections.
    prisma.eggCollection.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { rateCents: true },
    }),
    prisma.payment.aggregate({ where: { childId: userId }, _sum: { amountCents: true } }),
    // Sum each award's own snapshotted priceCents, so a later catalog price change
    // (or the prize being deleted) doesn't retroactively reprice past awards.
    prisma.prizeAward.aggregate({ where: { childId: userId }, _sum: { priceCents: true } }),
    getRateCents(),
  ]);

  const collectionsCount = collectionsAgg._count._all;
  const totalOwedCents = collectionsAgg._sum.rateCents ?? 0;
  const totalPaidCents = payments._sum.amountCents ?? 0;
  const totalPrizesCents = prizeAwards._sum.priceCents ?? 0;

  return {
    userId,
    name: user.name,
    color: user.color,
    collectionsCount,
    rateCents,
    totalOwedCents,
    totalPaidCents,
    totalPrizesCents,
    balanceCents: totalOwedCents - totalPaidCents - totalPrizesCents,
  };
}

export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
