const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPlan() {
    const plans = await prisma.planningEntry.findMany({ take: 3 });
    console.log('Planning entries:', JSON.stringify(plans, null, 2));

    const count = await prisma.planningEntry.count();
    console.log('Total plans:', count);

    await prisma.$disconnect();
}

checkPlan();
