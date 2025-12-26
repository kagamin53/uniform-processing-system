const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    const sample = await prisma.processingCode.findFirst({
        where: { baldanTime: { not: null } }
    });
    console.log('Sample with baldanTime:', JSON.stringify(sample, null, 2));

    const count = await prisma.processingCode.count({
        where: { baldanTime: { not: null } }
    });
    console.log('Total codes with baldanTime:', count);

    await prisma.$disconnect();
}

checkData();
