import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Default seed passwords. Change these later from inside the app (each user
// has a "change password" option once logged in) rather than editing here.
const USERS: { name: string; role: Role; password: string; color: string }[] = [
  { name: "Ethan", role: "CHILD", password: "1234", color: "#f59e0b" },
  { name: "Benedict", role: "CHILD", password: "2345", color: "#10b981" },
  { name: "Maxine", role: "CHILD", password: "3456", color: "#ec4899" },
  { name: "Xixu", role: "PARENT", password: "parent1", color: "#6366f1" },
  { name: "Zach", role: "PARENT", password: "parent2", color: "#0ea5e9" },
];

async function main() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { name: u.name },
      update: {},
      create: {
        name: u.name,
        role: u.role,
        passwordHash,
        color: u.color,
      },
    });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, rateCents: 100 },
  });

  console.log("Seeded users:", USERS.map((u) => `${u.name} (${u.password})`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
