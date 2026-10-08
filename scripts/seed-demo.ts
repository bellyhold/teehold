import "dotenv/config";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const url =
    process.env.DATABASE_URL ??
    `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash("demo-password-123", 10);

  const coach = await prisma.coach.upsert({
    where: { publicSlug: "demo-pro" },
    update: {
      name: "Alex Fairway",
      businessName: "Fairway Coaching",
      email: "demo@teehold.local",
      passwordHash,
      lessonDurationMin: 60,
      lessonPriceCents: 10000,
      depositFixedCents: 2500,
      depositType: "fixed",
      timezone: "America/New_York",
      plan: "trial",
    },
    create: {
      email: "demo@teehold.local",
      passwordHash,
      name: "Alex Fairway",
      businessName: "Fairway Coaching",
      publicSlug: "demo-pro",
      lessonDurationMin: 60,
      lessonPriceCents: 10000,
      depositFixedCents: 2500,
      depositType: "fixed",
      timezone: "America/New_York",
      plan: "trial",
    },
  });

  await prisma.availabilityRule.deleteMany({ where: { coachId: coach.id } });
  await prisma.availabilityRule.createMany({
    data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
      coachId: coach.id,
      weekday,
      startTime: "09:00",
      endTime: "17:00",
      locationLabel: "City Range",
    })),
  });

  await prisma.lessonType.deleteMany({ where: { coachId: coach.id } });
  await prisma.lessonType.create({
    data: {
      coachId: coach.id,
      name: "60-min lesson",
      durationMin: 60,
      priceCents: 10000,
      isActive: true,
    },
  });

  console.log("Seeded demo coach:");
  console.log("  Login: demo@teehold.local / demo-password-123");
  console.log("  Public: /c/demo-pro");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
