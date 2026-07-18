import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createUser, cookieForUser, resetDb } from "../helpers";

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/auth/profiles", () => {
  it("lists profiles without exposing password hashes", async () => {
    await createUser({ name: "Ethan", role: "CHILD" });
    await createUser({ name: "Zach", role: "PARENT" });

    const res = await request(app).get("/api/auth/profiles");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const profile of res.body) {
      expect(profile).not.toHaveProperty("passwordHash");
    }
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets a session cookie", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD", password: "1234" });

    const res = await request(app).post("/api/auth/login").send({ userId: user.id, password: "1234" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, name: "Ethan", role: "CHILD" });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/eggs_session=/);
  });

  it("rejects an incorrect password", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD", password: "1234" });
    const res = await request(app).post("/api/auth/login").send({ userId: user.id, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it("rejects an unknown profile id", async () => {
    const res = await request(app).post("/api/auth/login").send({ userId: "nope", password: "1234" });
    expect(res.status).toBe(401);
  });

  it("400s when the body is missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("401s without a session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user's profile when authenticated", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD" });
    const res = await request(app).get("/api/auth/me").set("Cookie", cookieForUser(user));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, name: "Ethan" });
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/eggs_session=;/);
  });
});

describe("POST /api/auth/change-password", () => {
  it("changes the password when the current password is correct", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD", password: "old-pass" });
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieForUser(user))
      .send({ currentPassword: "old-pass", newPassword: "new-pass" });
    expect(res.status).toBe(200);

    const loginRes = await request(app).post("/api/auth/login").send({ userId: user.id, password: "new-pass" });
    expect(loginRes.status).toBe(200);
  });

  it("rejects when the current password is wrong", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD", password: "old-pass" });
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieForUser(user))
      .send({ currentPassword: "wrong", newPassword: "new-pass" });
    expect(res.status).toBe(401);
  });

  it("rejects a too-short new password", async () => {
    const user = await createUser({ name: "Ethan", role: "CHILD", password: "old-pass" });
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieForUser(user))
      .send({ currentPassword: "old-pass", newPassword: "ab" });
    expect(res.status).toBe(400);
  });
});
