const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTime() {
    const plan = await prisma.planningEntry.findFirst();
    if (plan && plan.baldanTime) {
        console.log('baldanTime:', plan.baldanTime);
        console.log('Length:', plan.baldanTime.length);
        console.log('CharCodes:', [...plan.baldanTime].map(c => c.charCodeAt(0)));

        // Test regex
        const regex = /(\d+)'(\d+)/;
        const match = plan.baldanTime.match(regex);
        console.log('Regex match:', match);
    }
    await prisma.$disconnect();
}

debugTime();
