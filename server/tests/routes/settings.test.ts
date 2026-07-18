import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createUser, cookieForUser, resetDb } from "../helpers";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/settings", () => {
  it("401s without auth", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(401);
  });

  it("creates and returns the default rate on first access", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).get("/api/settings").set("Cookie", cookieForUser(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rate: 1 });
  });
});

describe("PUT /api/settings", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).put("/api/settings").set("Cookie", cookieForUser(child)).send({ rate: 2 });
    expect(res.status).toBe(403);
  });

  it("updates the rate, stored as cents", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app).put("/api/settings").set("Cookie", cookieForUser(parent)).send({ rate: 1.5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rate: 1.5 });

    const after = await request(app).get("/api/settings").set("Cookie", cookieForUser(parent));
    expect(after.body).toEqual({ rate: 1.5 });
  });

  it("rejects a non-positive rate", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    const res = await request(app).put("/api/settings").set("Cookie", cookieForUser(parent)).send({ rate: 0 });
    expect(res.status).toBe(400);
  });
});
