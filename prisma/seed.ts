import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed programs
  const programs = [
    { id: 1, name: "Fundamentals Gi",  type: "gi",    description: "Beginner gi class" },
    { id: 2, name: "Advanced Gi",      type: "gi",    description: "Advanced gi class" },
    { id: 3, name: "No-Gi Grappling",  type: "no-gi", description: "No-gi submission wrestling" },
    { id: 4, name: "Youth BJJ",        type: "youth", description: "Kids Brazilian Jiu-Jitsu" },
  ];
  for (const p of programs) {
    await prisma.program.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  // Seed sample classes for the current week
  const monday = new Date();
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  const classTemplates = [
    { dayOffset: 0, start: "18:00", end: "19:30", name: "Fundamentals Gi",  programId: 1, instructor: "Coach Rob" },
    { dayOffset: 0, start: "19:30", end: "21:00", name: "Advanced Gi",      programId: 2, instructor: "Coach Rob" },
    { dayOffset: 1, start: "12:00", end: "13:00", name: "Lunch No-Gi",      programId: 3, instructor: "Coach Rob" },
    { dayOffset: 1, start: "18:00", end: "19:30", name: "No-Gi Grappling",  programId: 3, instructor: "Coach Rob" },
    { dayOffset: 2, start: "18:00", end: "19:30", name: "Fundamentals Gi",  programId: 1, instructor: "Coach Rob" },
    { dayOffset: 2, start: "19:30", end: "21:00", name: "Advanced Gi",      programId: 2, instructor: "Coach Rob" },
    { dayOffset: 3, start: "18:00", end: "19:30", name: "No-Gi Grappling",  programId: 3, instructor: "Coach Rob" },
    { dayOffset: 4, start: "18:00", end: "19:30", name: "Fundamentals Gi",  programId: 1, instructor: "Coach Rob" },
    { dayOffset: 4, start: "19:30", end: "21:00", name: "Open Mat",         programId: 1, instructor: "Coach Rob" },
    { dayOffset: 5, start: "10:00", end: "11:30", name: "Youth BJJ",        programId: 4, instructor: "Coach Rob" },
    { dayOffset: 5, start: "11:30", end: "13:00", name: "Saturday Open Mat",programId: 1, instructor: "Coach Rob" },
  ];

  for (const t of classTemplates) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + t.dayOffset);
    const [sh, sm] = t.start.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(start);
    const [eh, em] = t.end.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    await prisma.class.create({
      data: { name: t.name, programId: t.programId, startTime: start, endTime: end, instructorName: t.instructor },
    });
  }
  console.log(`Seeded ${classTemplates.length} classes.`);

  // Seed membership plans
  const plans = [
    { id: 1, name: "Gi Unlimited",      planType: "gi",      priceCents: 14900, billingInterval: "monthly", description: "Unlimited gi classes" },
    { id: 2, name: "No-Gi Unlimited",   planType: "no-gi",   priceCents: 14900, billingInterval: "monthly", description: "Unlimited no-gi classes" },
    { id: 3, name: "Hybrid (Gi + No-Gi)", planType: "gi",    priceCents: 17900, billingInterval: "monthly", description: "Unlimited gi and no-gi classes" },
    { id: 4, name: "Kids Program",       planType: "kids",    priceCents: 10900, billingInterval: "monthly", description: "Youth BJJ classes" },
    { id: 5, name: "Family Plan",        planType: "family",  priceCents: 24900, billingInterval: "monthly", description: "Up to 4 family members" },
    { id: 6, name: "Online Only",        planType: "online",  priceCents:  4900, billingInterval: "monthly", description: "Access to online curriculum" },
    { id: 7, name: "Drop-In",            planType: "drop-in", priceCents:  2500, billingInterval: "monthly", classLimit: 1, description: "Single class drop-in" },
  ];

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({ where: { id: plan.id }, update: {}, create: plan });
  }

  // Seed demo members
  const members = [
    { name: "Alice Johnson", email: "alice@example.com", beltRank: "blue",   ageGroup: "adult", trainingType: "Gi",    status: "active" },
    { name: "Bob Martinez",  email: "bob@example.com",   beltRank: "white",  ageGroup: "adult", trainingType: "Both",  status: "active" },
    { name: "Carlos Silva",  email: "carlos@example.com",beltRank: "purple", ageGroup: "adult", trainingType: "Gi",    status: "active" },
    { name: "Diana Chen",    email: "diana@example.com", beltRank: "white",  ageGroup: "adult", trainingType: "No-Gi", status: "trial"  },
    { name: "Ethan Park",    email: "ethan@example.com", beltRank: "blue",   ageGroup: "adult", trainingType: "Both",  status: "past_due" },
    { name: "Fiona Walsh",   email: "fiona@example.com", beltRank: "brown",  ageGroup: "adult", trainingType: "Gi",    status: "active" },
    { name: "Gus Thompson",  email: "gus@example.com",   beltRank: "white",  ageGroup: "kids",  trainingType: "Gi",    status: "active" },
    { name: "Hannah Lee",    email: "hannah@example.com",beltRank: "black",  ageGroup: "adult", trainingType: "Gi",    status: "active" },
  ];

  for (const m of members) {
    await prisma.member.upsert({
      where: { id: members.indexOf(m) + 1 },
      update: {},
      create: m,
    });
  }

  console.log(`Seeded ${plans.length} plans and ${members.length} members.`);

  // Seed admin user
  const adminHash = await bcrypt.hash("admin1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@bjj.local" },
    update: {},
    create: { email: "admin@bjj.local", name: "Admin", passwordHash: adminHash, role: "admin" },
  });

  const staffHash = await bcrypt.hash("staff1234", 12);
  await prisma.user.upsert({
    where: { email: "staff@bjj.local" },
    update: {},
    create: { email: "staff@bjj.local", name: "Staff User", passwordHash: staffHash, role: "staff" },
  });

  console.log("Seeded admin@bjj.local (admin1234) and staff@bjj.local (staff1234).");

  // Seed belt requirements
  const beltReqs = [
    { beltRank: "blue",   minClasses: 100, minMonths: 12, minTechniques: 18 },
    { beltRank: "purple", minClasses: 200, minMonths: 24, minTechniques: 15 },
    { beltRank: "brown",  minClasses: 200, minMonths: 36, minTechniques: 12 },
    { beltRank: "black",  minClasses: 200, minMonths: 48, minTechniques: 10 },
  ];
  for (const r of beltReqs) {
    await prisma.beltRequirement.upsert({
      where: { id: (await prisma.beltRequirement.findFirst({ where: { beltRank: r.beltRank } }))?.id ?? 0 },
      update: r,
      create: r,
    });
  }
  console.log("Seeded belt requirements.");

  // Seed POS items
  const posItems = [
    // Drinks
    { name: "Water",           category: "drinks", priceCents:  200, taxRate: 0,    stock: 50 },
    { name: "Gatorade",        category: "drinks", priceCents:  300, taxRate: 0,    stock: 30 },
    { name: "Coffee",          category: "drinks", priceCents:  300, taxRate: 0,    stock: null },
    { name: "Protein Shake",   category: "drinks", priceCents:  500, taxRate: 0,    stock: 20 },
    { name: "Energy Drink",    category: "drinks", priceCents:  400, taxRate: 0,    stock: 24 },
    // Gear
    { name: "Mouth Guard",     category: "gear",   priceCents: 1500, taxRate: 8.5,  stock: 15 },
    { name: "Rash Guard",      category: "gear",   priceCents: 4500, taxRate: 8.5,  stock: 10 },
    { name: "BJJ Shorts",      category: "gear",   priceCents: 3500, taxRate: 8.5,  stock: 8  },
    { name: "Spats",           category: "gear",   priceCents: 4000, taxRate: 8.5,  stock: 6  },
    { name: "Ear Guards",      category: "gear",   priceCents: 2500, taxRate: 8.5,  stock: 5  },
    // Events
    { name: "Competition Entry", category: "events", priceCents: 7500, taxRate: 0, stock: null },
    { name: "Seminar Ticket",    category: "events", priceCents: 5000, taxRate: 0, stock: 20  },
    { name: "Private Lesson",    category: "events", priceCents: 8000, taxRate: 0, stock: null },
  ];
  for (const item of posItems) {
    const existing = await prisma.item.findFirst({ where: { name: item.name, category: item.category } });
    if (!existing) {
      await prisma.item.create({ data: item });
    }
  }
  console.log(`Seeded ${posItems.length} POS items.`);

  // Seed family: Bob Martinez (parent) + Gus Thompson (child)
  const bob = await prisma.member.findFirst({ where: { name: "Bob Martinez" } });
  const gus = await prisma.member.findFirst({ where: { name: "Gus Thompson" } });
  if (bob && gus && gus.parentId !== bob.id) {
    await prisma.member.update({ where: { id: gus.id }, data: { parentId: bob.id } });
  }

  // Portal account for Bob
  if (bob) {
    const bobHash = await bcrypt.hash("parent1234", 12);
    await prisma.user.upsert({
      where: { email: "bob@example.com" },
      update: {},
      create: { email: "bob@example.com", name: "Bob Martinez", passwordHash: bobHash, role: "parent", memberId: bob.id },
    });
    console.log("Seeded family: Bob Martinez (parent) + Gus Thompson (child). Portal: bob@example.com / parent1234");
  }

  // Seed demo marketing workflows
  const demoWorkflows = [
    {
      name: "Win-back Inactive Members",
      triggerType: "inactivity",
      active: true,
      config: {
        channel: "email",
        subject: "We miss you, {{name}}!",
        body: "Hey {{name}}, it's been {{days}} days since we've seen you on the mats. Come back and keep that progress going — your first class back is on us. See you soon!",
        inactivity_days: 30,
        cooldown_days: 30,
      },
    },
    {
      name: "Trial Convert — 3 Classes",
      triggerType: "trial_attendance",
      active: true,
      config: {
        channel: "email",
        subject: "You've hit {{classes}} classes, {{name}} — ready to join?",
        body: "Hi {{name}}, you've attended {{classes}} trial classes and we've loved having you. Let's talk about making it official. Reply to this email or ask at the front desk to see our membership options.",
        trial_classes: 3,
        cooldown_days: 7,
      },
    },
    {
      name: "Birthday Shoutout",
      triggerType: "birthday",
      active: true,
      config: {
        channel: "in_app",
        body: "Happy Birthday {{name}}! The whole team is wishing you an amazing day. See you on the mats!",
        cooldown_days: 365,
      },
    },
    {
      name: "Failed Payment Alert",
      triggerType: "failed_payment",
      active: true,
      config: {
        channel: "email",
        subject: "Action needed: update your payment info",
        body: "Hi {{name}}, we had trouble processing your last membership payment. Please update your payment method to keep your membership active. Contact us if you need help.",
        cooldown_days: 14,
      },
    },
    {
      name: "Belt Promotion Congrats",
      triggerType: "promotion",
      active: true,
      config: {
        channel: "in_app",
        body: "Congratulations {{name}} on your {{belt}} belt! Your hard work and dedication have paid off. Keep training!",
        cooldown_days: 0,
      },
    },
  ];

  for (const wf of demoWorkflows) {
    const existing = await prisma.workflow.findFirst({ where: { name: wf.name } });
    if (!existing) {
      await prisma.workflow.create({ data: wf });
    }
  }
  console.log(`Seeded ${demoWorkflows.length} marketing workflows.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
