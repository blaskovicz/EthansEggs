import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createUser, cookieForUser, resetDb } from "../helpers";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/users/children", () => {
  it("requires a parent", async () => {
    const child = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).get("/api/users/children").set("Cookie", cookieForUser(child));
    expect(res.status).toBe(403);
  });

  it("returns every child with their balance summary", async () => {
    const parent = await createUser({ name: "Zach", role: "PARENT" });
    await createUser({ name: "Ethan", role: "CHILD" });
    await createUser({ name: "Benedict", role: "CHILD" });

    const res = await request(app).get("/api/users/children").set("Cookie", cookieForUser(parent));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((b: any) => b.name).sort()).toEqual(["Benedict", "Ethan"]);
    expect(res.body[0]).toHaveProperty("balanceCents");
  });
});
