import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../src/db";
import type { AuthTokenPayload } from "../src/middleware/auth";

const COOKIE_NAME = "eggs_session";

export async function resetDb() {
  // Last line of defense: never wipe anything that isn't obviously the
  // disposable test database, no matter how DATABASE_URL got set.
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.includes("test.db")) {
    throw new Error(`resetDb() refused to run: DATABASE_URL ("${dbUrl}") is not the test database.`);
  }

  await prisma.payment.deleteMany();
  await prisma.eggCollection.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(opts: {
  name: string;
  role: Role;
  password?: string;
  color?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password ?? "password123", 4);
  return prisma.user.create({
    data: {
      name: opts.name,
      role: opts.role,
      passwordHash,
      color: opts.color ?? "#6366f1",
    },
  });
}

export function sessionCookieFor(payload: AuthTokenPayload): string {
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "30d" });
  return `${COOKIE_NAME}=${token}`;
}

export function cookieForUser(user: { id: string; role: Role; name: string }): string {
  return sessionCookieFor({ userId: user.id, role: user.role, name: user.name });
}
