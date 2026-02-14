const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkPageViews() {
  try {
    const pageViews = await prisma.pageView.findMany({
      orderBy: { date: 'desc' },
      take: 10,
    });
    
    console.log('Page Views:', pageViews);
    
    const totalViews = await prisma.pageView.aggregate({
      _sum: { count: true }
    });
    
    console.log('Total Views:', totalViews._sum.count || 0);
    
  } catch (error) {
    console.error('Error checking page views:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPageViews();