import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db";
import { createUser, cookieForUser, resetDb } from "../helpers";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/prizes", () => {
  it("401s without auth", async () => {
    const res = await request(app).get("/api/prizes");
    expect(res.status).toBe(401);
  });

  it("is visible to a child (the shop)", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await prisma.prize.create({ data: { name: "Ice cream", priceCents: 300, icon: "🍦" } });
    const res = await request(app).get("/api/prizes").set("Cookie", cookieForUser(child));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: "Ice cream", priceCents: 300, icon: "🍦" });
  });
});

describe("POST /api/prizes", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/prizes")
      .set("Cookie", cookieForUser(child))
      .send({ name: "Ice cream", price: 3, icon: "🍦" });
    expect(res.status).toBe(403);
  });

  it("creates a prize, converting dollars to cents", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app)
      .post("/api/prizes")
      .set("Cookie", cookieForUser(parent))
      .send({ name: "Ice cream", price: 3.5, icon: "🍦" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Ice cream", priceCents: 350, icon: "🍦" });
  });

  it("400s on a non-positive price", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app)
      .post("/api/prizes")
      .set("Cookie", cookieForUser(parent))
      .send({ name: "Ice cream", price: 0, icon: "🍦" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/prizes/:id", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).delete("/api/prizes/some-id").set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });

  it("deletes a prize but keeps past awards (snapshotted fields intact)", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const prize = await prisma.prize.create({ data: { name: "Ice cream", priceCents: 300, icon: "🍦" } });
    const award = await prisma.prizeAward.create({
      data: {
        childId: child.id,
        prizeId: prize.id,
        name: prize.name,
        priceCents: prize.priceCents,
        icon: prize.icon,
        awardedById: parent.id,
      },
    });

    const res = await request(app).delete(`/api/prizes/${prize.id}`).set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
    expect(await prisma.prize.findUnique({ where: { id: prize.id } })).toBeNull();

    const stillThere = await prisma.prizeAward.findUnique({ where: { id: award.id } });
    expect(stillThere).toMatchObject({ name: "Ice cream", priceCents: 300, icon: "🍦", prizeId: null });
  });

  it("is a no-op (still 200) for a missing prize id", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app).delete("/api/prizes/does-not-exist").set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/prizes/:id/award", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const prize = await prisma.prize.create({ data: { name: "Ice cream", priceCents: 300, icon: "🍦" } });
    const res = await request(app)
      .post(`/api/prizes/${prize.id}/award`)
      .set("Cookie", cookieForUser(child))
      .send({ childId: child.id });
    expect(res.status).toBe(403);
  });

  it("awards a prize to a child, snapshotting the catalog's current fields", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const prize = await prisma.prize.create({ data: { name: "Ice cream", priceCents: 300, icon: "🍦" } });

    const res = await request(app)
      .post(`/api/prizes/${prize.id}/award`)
      .set("Cookie", cookieForUser(parent))
      .send({ childId: child.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      childId: child.id,
      prizeId: prize.id,
      name: "Ice cream",
      priceCents: 300,
      icon: "🍦",
      awardedById: parent.id,
    });
  });

  it("later catalog price changes don't affect an already-awarded prize", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const prize = await prisma.prize.create({ data: { name: "Ice cream", priceCents: 300, icon: "🍦" } });

    const award = await request(app)
      .post(`/api/prizes/${prize.id}/award`)
      .set("Cookie", cookieForUser(parent))
      .send({ childId: child.id });

    await prisma.prize.update({ where: { id: prize.id }, data: { priceCents: 999 } });

    const stored = await prisma.prizeAward.findUnique({ where: { id: award.body.id } });
    expect(stored?.priceCents).toBe(300);
  });

  it("404s for a non-existent prize", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/prizes/does-not-exist/award")
      .set("Cookie", cookieForUser(parent))
      .send({ childId: child.id });
    expect(res.status).toBe(404);
  });

  it("404s for a non-existent or non-child target", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const prize = await prisma.prize.create({ data: { name: "Ice cream", priceCents: 300, icon: "🍦" } });
    const res = await request(app)
      .post(`/api/prizes/${prize.id}/award`)
      .set("Cookie", cookieForUser(parent))
      .send({ childId: "missing" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/prizes/awards/user/:id", () => {
  it("lets a child view their own awards", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await prisma.prizeAward.create({
      data: { childId: child.id, name: "Ice cream", priceCents: 300, icon: "🍦", awardedById: parent.id },
    });

    const res = await request(app)
      .get(`/api/prizes/awards/user/${child.id}`)
      .set("Cookie", cookieForUser(child));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].awardedBy.name).toBe("Zach");
  });

  it("forbids a child from viewing another child's awards", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const sibling = await createUser({ name: "Benedict", role: "CHILD" });
    const res = await request(app)
      .get(`/api/prizes/awards/user/${sibling.id}`)
      .set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/prizes/awards/:id", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .delete("/api/prizes/awards/some-id")
      .set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });

  it("cancels an award, refunding the child's balance", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const award = await prisma.prizeAward.create({
      data: { childId: child.id, name: "Ice cream", priceCents: 300, icon: "🍦", awardedById: parent.id },
    });

    const res = await request(app)
      .delete(`/api/prizes/awards/${award.id}`)
      .set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
    expect(await prisma.prizeAward.findUnique({ where: { id: award.id } })).toBeNull();
  });
});
