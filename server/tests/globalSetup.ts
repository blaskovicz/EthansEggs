import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";
import dotenv from "dotenv";

// Runs once before the whole test suite. Points Prisma at a dedicated sqlite
// file (never the real dev.db) and applies committed migrations to it, so
// tests exercise the real schema without ever touching household data.
export async function setup() {
  dotenv.config({ path: path.join(__dirname, "..", ".env.test") });

  const dbPath = path.join(__dirname, "..", "prisma", "test.db");
  for (const f of [dbPath, `${dbPath}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit",
  });
}
