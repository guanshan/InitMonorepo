import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const run = async () => {
  await prisma.user.upsert({
    where: {
      email: "ada@example.com",
    },
    update: {},
    create: {
      email: "ada@example.com",
      name: "Ada Lovelace",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: {
      email: "grace@example.com",
    },
    update: {},
    create: {
      email: "grace@example.com",
      name: "Grace Hopper",
      role: "SUPPORT",
    },
  });
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
