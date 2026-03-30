const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.syncJob.findMany({
    include: { runs: true }
  });
  console.log("Jobs:");
  jobs.forEach(j => {
    console.log(`- Job ${j.id}: ${j.name}`);
    const latestRun = j.runs[j.runs.length - 1];
    if (latestRun) {
      console.log(`  Latest run: ${latestRun.status}, progress: ${latestRun.progress}, msg: ${latestRun.progressMessage}`);
    }
  });
}
main();
