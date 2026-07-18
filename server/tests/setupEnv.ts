import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.test"), override: true });

// Same guard as globalSetup.ts: this file sets DATABASE_URL for whichever
// Prisma client `resetDb()` actually connects with, so it gets its own
// belt-and-suspenders check too.
const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.includes("test.db")) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL ("${dbUrl}") does not point at test.db. ` +
      "This guard exists so a misconfigured environment can never let tests reset the real database."
  );
}
