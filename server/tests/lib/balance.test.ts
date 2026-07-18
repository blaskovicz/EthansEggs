import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db";
import { computeChildBalance, getRateCents, todayLocalDate } from "../../src/lib/balance";
import { createUser, resetDb } from "../helpers";

beforeEach(async () => {
  await resetDb();
});

describe("todayLocalDate", () => {
  it("returns a YYYY-MM-DD string matching the local date", () => {
    const result = todayLocalDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("getRateCents", () => {
  it("defaults to 100 when no settings row exists", async () => {
    expect(await getRateCents()).toBe(100);
  });

  it("returns the configured rate", async () => {
    await prisma.settings.create({ data: { id: 1, rateCents: 250 } });
    expect(await getRateCents()).toBe(250);
  });
});

describe("computeChildBalance", () => {
  it("computes zero balance for a child with no activity", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const balance = await computeChildBalance(child.id);
    expect(balance).toMatchObject({
      userId: child.id,
      name: "Ethan",
      collectionsCount: 0,
      rateCents: 100,
      totalOwedCents: 0,
      totalPaidCents: 0,
      balanceCents: 0,
    });
  });

  it("owes each collection's own snapshotted rate, minus payments made", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    await prisma.settings.create({ data: { id: 1, rateCents: 150 } });

    await prisma.eggCollection.createMany({
      data: [
        { userId: child.id, date: "2026-07-16", rateCents: 150 },
        { userId: child.id, date: "2026-07-17", rateCents: 150 },
        { userId: child.id, date: "2026-07-18", rateCents: 150 },
      ],
    });
    await prisma.payment.create({
      data: { childId: child.id, amountCents: 200, recordedById: parent.id },
    });

    const balance = await computeChildBalance(child.id);
    expect(balance.collectionsCount).toBe(3);
    expect(balance.totalOwedCents).toBe(450);
    expect(balance.totalPaidCents).toBe(200);
    expect(balance.balanceCents).toBe(250);
  });

  it("counts collections marked as helper the same as a direct collection", async () => {
    const child = await createUser({ name: "Benedict", role: "CHILD" });
    await prisma.eggCollection.create({
      data: { userId: child.id, date: "2026-07-18", isHelper: true, rateCents: 100 },
    });
    const balance = await computeChildBalance(child.id);
    expect(balance.collectionsCount).toBe(1);
    expect(balance.totalOwedCents).toBe(100);
  });

  it("does not retroactively reprice past collections when the rate changes later", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await prisma.settings.create({ data: { id: 1, rateCents: 100 } });

    // Collected back when the rate was $1.00.
    await prisma.eggCollection.create({
      data: { userId: child.id, date: "2026-07-10", rateCents: 100 },
    });

    // Parent drops the rate to $0.50 - shouldn't touch the earlier collection.
    await prisma.settings.update({ where: { id: 1 }, data: { rateCents: 50 } });
    await prisma.eggCollection.create({
      data: { userId: child.id, date: "2026-07-18", rateCents: 50 },
    });

    const balance = await computeChildBalance(child.id);
    expect(balance.collectionsCount).toBe(2);
    expect(balance.totalOwedCents).toBe(150); // 100 (old rate) + 50 (new rate), not 2 * 50
  });

  it("throws when the user does not exist", async () => {
    await expect(computeChildBalance("does-not-exist")).rejects.toThrow();
  });
});
