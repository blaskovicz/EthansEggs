import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { todayLocalDate } from "../../src/lib/balance";
import { createUser, cookieForUser, resetDb } from "../helpers";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/eggs/collect", () => {
  it("401s without auth", async () => {
    const res = await request(app).post("/api/eggs/collect").send({});
    expect(res.status).toBe(401);
  });

  it("creates today's entry for the logged-in child", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/eggs/collect")
      .set("Cookie", cookieForUser(child))
      .send({ eggCount: 5 });

    expect(res.status).toBe(201);
    expect(res.body.entry).toMatchObject({ userId: child.id, eggCount: 5, isHelper: false });
    expect(res.body.helperEntries).toEqual([]);
  });

  it("also creates entries for named helpers", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const helper = await createUser({ name: "Benedict", role: "CHILD" });

    const res = await request(app)
      .post("/api/eggs/collect")
      .set("Cookie", cookieForUser(child))
      .send({ eggCount: 3, helperIds: [helper.id] });

    expect(res.status).toBe(201);
    expect(res.body.helperEntries).toHaveLength(1);
    expect(res.body.helperEntries[0]).toMatchObject({ userId: helper.id, eggCount: 3, isHelper: true });
  });

  it("ignores a helperId equal to the requester's own id", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/eggs/collect")
      .set("Cookie", cookieForUser(child))
      .send({ helperIds: [child.id] });

    expect(res.status).toBe(201);
    expect(res.body.helperEntries).toEqual([]);
  });

  it("rejects a second collection attempt for the same day from anyone", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const other = await createUser({ name: "Benedict", role: "CHILD" });

    const first = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(other)).send({});
    expect(second.status).toBe(403);
    expect(second.body.error).toMatch(/Ethan/);
  });

  it("labels a parent's entry distinctly in the conflict message", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });

    await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(parent)).send({});
    const res = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Zach \(a parent\)/);
  });

  it("does not let a parent name helpers", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });

    const res = await request(app)
      .post("/api/eggs/collect")
      .set("Cookie", cookieForUser(parent))
      .send({ helperIds: [child.id] });

    expect(res.status).toBe(201);
    expect(res.body.helperEntries).toEqual([]);
  });

  it("rejects an invalid eggCount", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/eggs/collect")
      .set("Cookie", cookieForUser(child))
      .send({ eggCount: -5 });
    expect(res.status).toBe(400);
  });

  it("snapshots the rate at collection time onto the entry", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const parent = await createUser({ name: "Zach", role: "PARENT" });

    const res = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});
    expect(res.body.entry.rateCents).toBe(100);

    // Rate change after the fact shouldn't touch the entry that was already created.
    await request(app).put("/api/settings").set("Cookie", cookieForUser(parent)).send({ rate: 0.5 });
    const mine = await request(app).get("/api/eggs/mine").set("Cookie", cookieForUser(child));
    expect(mine.body.entries[0].rateCents).toBe(100);
    expect(mine.body.balance.totalOwedCents).toBe(100);
  });
});

describe("DELETE /api/eggs/collect/today", () => {
  it("removes only the caller's own entry for today", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});

    const del = await request(app).delete("/api/eggs/collect/today").set("Cookie", cookieForUser(child));
    expect(del.status).toBe(200);

    const mine = await request(app).get("/api/eggs/mine").set("Cookie", cookieForUser(child));
    expect(mine.body.entries).toEqual([]);
    expect(mine.body.markedToday).toBe(false);
  });
});

describe("GET /api/eggs/today", () => {
  it("shows entries from everyone, including collector name/role/color", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD", color: "#f59e0b" });
    await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({ eggCount: 4 });

    const res = await request(app).get("/api/eggs/today").set("Cookie", cookieForUser(child));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      eggCount: 4,
      user: { name: "Ethan", role: "CHILD", color: "#f59e0b" },
    });
  });
});

describe("GET /api/eggs/mine", () => {
  it("returns balance, entries, and markedToday for the caller", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});

    const res = await request(app).get("/api/eggs/mine").set("Cookie", cookieForUser(child));
    expect(res.status).toBe(200);
    expect(res.body.markedToday).toBe(true);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.balance.collectionsCount).toBe(1);
  });
});

describe("POST /api/eggs/manual", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/eggs/manual")
      .set("Cookie", cookieForUser(child))
      .send({ userId: child.id, date: "2026-07-23", eggCount: 13 });
    expect(res.status).toBe(403);
  });

  it("lets a parent backdate a missed collection for a child", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });

    const res = await request(app)
      .post("/api/eggs/manual")
      .set("Cookie", cookieForUser(parent))
      .send({ userId: child.id, date: "2026-07-23", eggCount: 13 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: child.id, date: "2026-07-23", eggCount: 13, isHelper: false });

    const mine = await request(app).get(`/api/eggs/user/${child.id}`).set("Cookie", cookieForUser(parent));
    expect(mine.body.balance.collectionsCount).toBe(1);
  });

  it("404s for a non-existent or non-child target", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app)
      .post("/api/eggs/manual")
      .set("Cookie", cookieForUser(parent))
      .send({ userId: "missing", date: "2026-07-23" });
    expect(res.status).toBe(404);
  });

  it("400s on a future date", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app)
      .post("/api/eggs/manual")
      .set("Cookie", cookieForUser(parent))
      .send({ userId: child.id, date: "2999-01-01" });
    expect(res.status).toBe(400);
  });

  it("409s when the child already has an entry for that date", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});
    const today = todayLocalDate();

    const res = await request(app)
      .post("/api/eggs/manual")
      .set("Cookie", cookieForUser(parent))
      .send({ userId: child.id, date: today });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/eggs/:id", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const create = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});
    const res = await request(app)
      .patch(`/api/eggs/${create.body.entry.id}`)
      .set("Cookie", cookieForUser(child))
      .send({ eggCount: 7 });
    expect(res.status).toBe(403);
  });

  it("lets a parent correct an entry's egg count", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const create = await request(app)
      .post("/api/eggs/collect")
      .set("Cookie", cookieForUser(child))
      .send({ eggCount: 5 });

    const res = await request(app)
      .patch(`/api/eggs/${create.body.entry.id}`)
      .set("Cookie", cookieForUser(parent))
      .send({ eggCount: 9 });

    expect(res.status).toBe(200);
    expect(res.body.eggCount).toBe(9);
  });

  it("404s for a missing entry", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app)
      .patch("/api/eggs/does-not-exist")
      .set("Cookie", cookieForUser(parent))
      .send({ eggCount: 3 });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/eggs/:id", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const create = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});
    const res = await request(app)
      .delete(`/api/eggs/${create.body.entry.id}`)
      .set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });

  it("lets a parent cancel any entry, any owner", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const create = await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});

    const res = await request(app)
      .delete(`/api/eggs/${create.body.entry.id}`)
      .set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);

    const mine = await request(app).get(`/api/eggs/user/${child.id}`).set("Cookie", cookieForUser(parent));
    expect(mine.body.entries).toEqual([]);
  });

  it("is a no-op (still 200) for a missing entry id", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app).delete("/api/eggs/does-not-exist").set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/eggs/user/:id", () => {
  it("lets a parent view any child's history", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    await request(app).post("/api/eggs/collect").set("Cookie", cookieForUser(child)).send({});

    const res = await request(app).get(`/api/eggs/user/${child.id}`).set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
  });

  it("forbids a child from viewing another child's history", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const sibling = await createUser({ name: "Benedict", role: "CHILD" });

    const res = await request(app).get(`/api/eggs/user/${sibling.id}`).set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });

  it("lets a child view their own history", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).get(`/api/eggs/user/${child.id}`).set("Cookie", cookieForUser(child));
    expect(res.status).toBe(200);
  });
});
