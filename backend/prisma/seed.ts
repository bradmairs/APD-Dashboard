import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

const DEMO_PASSWORD = "ChangeMe123!";

async function seedUsers(): Promise<Record<string, string>> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = await Promise.all(
    [
      { name: "A. Nguyen", email: "a.nguyen@example.com", passwordHash },
      { name: "S. Patel", email: "s.patel@example.com", passwordHash },
      { name: "J. Wilson", email: "j.wilson@example.com", passwordHash },
      {
        name: "Admin",
        email: "admin@example.com",
        passwordHash,
        role: "ADMIN" as const,
      },
      // Upsert by email rather than skipping wholesale when any user exists —
      // otherwise a demo user added here later (like Admin was) never gets
      // created against a database seeded before that addition.
    ].map((data) =>
      prisma.user.upsert({ where: { email: data.email }, update: {}, create: data })
    )
  );
  console.log(`Seeded ${users.length} demo users (password: ${DEMO_PASSWORD}).`);
  return Object.fromEntries(users.map((u) => [u.name, u.id]));
}

async function main() {
  const userIdByName = await seedUsers();

  const count = await prisma.project.count();
  if (count > 0) {
    console.log("Projects already exist, skipping seed.");
    return;
  }

  await prisma.project.create({
    data: {
      name: "Northvale WRP Upgrade",
      description: "Capacity upgrade of the Northvale Water Reclamation Plant (demo data).",
      assetType: "Treatment Plant",
      status: "CONSTRUCTION",
      projectManager: "A. Nguyen",
      projectManagerId: userIdByName["A. Nguyen"],
      createdById: userIdByName["A. Nguyen"],
      location: "Northvale",
      contractor: "Example Civil Pty Ltd",
      budget: 8500000,
      contractValue: 7920000,
      startDate: daysFromNow(-200),
      targetCompletionDate: daysFromNow(300),
      tasks: {
        create: [
          {
            title: "Complete civil works - clarifier upgrade",
            status: "DONE",
            dueDate: daysFromNow(-120),
          },
          {
            title: "Mechanical installation - blowers",
            status: "IN_PROGRESS",
            dueDate: daysFromNow(45),
          },
          {
            title: "Electrical & controls commissioning",
            status: "TODO",
            dueDate: daysFromNow(150),
          },
          {
            title: "Practical completion inspection",
            status: "TODO",
            dueDate: daysFromNow(300),
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Eastbrook Trunk Main Renewal",
      description: "Replacement of an ageing trunk main along Main Road (demo data).",
      assetType: "Pipeline",
      status: "TENDER",
      projectManager: "S. Patel",
      projectManagerId: userIdByName["S. Patel"],
      createdById: userIdByName["S. Patel"],
      location: "Eastbrook",
      budget: 2100000,
      targetCompletionDate: daysFromNow(400),
      tasks: {
        create: [
          {
            title: "Finalise tender documentation",
            status: "DONE",
            dueDate: daysFromNow(-60),
          },
          {
            title: "Evaluate tender submissions",
            status: "IN_PROGRESS",
            dueDate: daysFromNow(15),
          },
          {
            title: "Award contract",
            status: "TODO",
            dueDate: daysFromNow(35),
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Westfield Pump Station Refurbishment",
      description: "Refurbishment of a sewage pump station (demo data).",
      assetType: "Pump Station",
      status: "DESIGN",
      projectManager: "A. Nguyen",
      projectManagerId: userIdByName["A. Nguyen"],
      createdById: userIdByName["A. Nguyen"],
      location: "Westfield",
      budget: 950000,
      targetCompletionDate: daysFromNow(500),
      tasks: {
        create: [
          {
            title: "Concept design review",
            status: "DONE",
          },
          {
            title: "Detailed design - mechanical",
            status: "IN_PROGRESS",
            dueDate: daysFromNow(60),
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Southridge Reservoir Roof Replacement",
      description: "Replace a corroded reservoir roof structure (demo data).",
      assetType: "Reservoir",
      status: "DEFECTS_LIABILITY",
      projectManager: "J. Wilson",
      projectManagerId: userIdByName["J. Wilson"],
      createdById: userIdByName["J. Wilson"],
      location: "Southridge",
      contractor: "Sample Constructions Pty Ltd",
      budget: 1200000,
      contractValue: 1145000,
      startDate: daysFromNow(-400),
      targetCompletionDate: daysFromNow(-120),
      actualCompletionDate: daysFromNow(-130),
      tasks: {
        create: [
          { title: "Practical completion", status: "DONE" },
          {
            title: "12-month defects inspection",
            status: "TODO",
            dueDate: daysFromNow(235),
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Hillcrest Depot Office Refit",
      description: "Refit of a depot office building for crew facilities (demo data).",
      assetType: "Building",
      status: "PLANNING",
      projectManager: "S. Patel",
      projectManagerId: userIdByName["S. Patel"],
      createdById: userIdByName["S. Patel"],
      location: "Hillcrest",
      budget: 480000,
    },
  });

  console.log("Seed data created.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
