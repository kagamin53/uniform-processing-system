// startTimeの状況を確認
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const plans = await p.planningEntry.findMany({
        where: { processingType: 'embroidery' },
        take: 10,
        select: { id: true, startTime: true, planDate: true, processingCode: true }
    });
    console.log(JSON.stringify(plans, null, 2));
    await p.$disconnect();
}

check();
