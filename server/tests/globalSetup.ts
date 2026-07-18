import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";
import dotenv from "dotenv";

// Runs once before the whole test suite. Points Prisma at a dedicated sqlite
// file (never the real dev.db) and applies committed migrations to it, so
// tests exercise the real schema without ever touching household data.
//
// override: true is load-bearing here - without it, an already-set
// DATABASE_URL in the ambient shell environment silently wins over
// .env.test, and every test's resetDb() would wipe the *real* database
// instead of the throwaway one.
export async function setup() {
  dotenv.config({ path: path.join(__dirname, "..", ".env.test"), override: true });

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.includes("test.db")) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL ("${dbUrl}") does not point at test.db. ` +
        "This guard exists so a misconfigured environment can never let tests reset the real database."
    );
  }

  const dbPath = path.join(__dirname, "..", "prisma", "test.db");
  for (const f of [dbPath, `${dbPath}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
  });
}
