import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db";
import { createUser, cookieForUser, resetDb } from "../helpers";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/payments", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/payments")
      .set("Cookie", cookieForUser(child))
      .send({ childId: child.id, amount: 5 });
    expect(res.status).toBe(403);
  });

  it("records a payment for a child, converting dollars to cents", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });

    const res = await request(app)
      .post("/api/payments")
      .set("Cookie", cookieForUser(parent))
      .send({ childId: child.id, amount: 12.5, note: "allowance" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ childId: child.id, amountCents: 1250, note: "allowance" });
  });

  it("404s for a non-existent or non-child target", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app)
      .post("/api/payments")
      .set("Cookie", cookieForUser(parent))
      .send({ childId: "missing", amount: 5 });
    expect(res.status).toBe(404);
  });

  it("400s on a non-positive amount", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/payments")
      .set("Cookie", cookieForUser(parent))
      .send({ childId: child.id, amount: -1 });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/payments/user/:id", () => {
  it("lets a child view their own payments", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await prisma.payment.create({ data: { childId: child.id, amountCents: 500, recordedById: parent.id } });

    const res = await request(app).get(`/api/payments/user/${child.id}`).set("Cookie", cookieForUser(child));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].recordedBy.name).toBe("Zach");
  });

  it("forbids a child from viewing another child's payments", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const sibling = await createUser({ name: "Benedict", role: "CHILD" });
    const res = await request(app).get(`/api/payments/user/${sibling.id}`).set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/payments/:id", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).delete("/api/payments/some-id").set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });

  it("deletes an existing payment", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const payment = await prisma.payment.create({
      data: { childId: child.id, amountCents: 500, recordedById: parent.id },
    });

    const res = await request(app).delete(`/api/payments/${payment.id}`).set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toBeNull();
  });

  it("is a no-op (still 200) for a missing payment id", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app).delete("/api/payments/does-not-exist").set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
  });
});
