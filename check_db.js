const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking database...");
    await prisma.syncJob.findFirst();
    await prisma.syncRun.findFirst();
    await prisma.pageView.findFirst();
    await prisma.user.findFirst();
    console.log("Database connection & tables are fine!");
  } catch (err) {
    console.error("Database error details:", err.message || err);
  }
}
main();
