// 12月26日の計画を確認
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const plans = await p.planningEntry.findMany({
        where: {
            planDate: {
                gte: new Date('2025-12-26'),
                lt: new Date('2025-12-27')
            }
        },
        orderBy: { startTime: 'asc' },
        select: { id: true, startTime: true, prepMinutes: true, plannedSeconds: true, processingCode: true }
    });

    let total = 0;
    plans.forEach(plan => {
        const mins = plan.prepMinutes + Math.ceil((plan.plannedSeconds || 0) / 60);
        total += mins;
        console.log(plan.startTime, mins + 'min', plan.processingCode);
    });
    console.log('---');
    console.log('Total:', total, 'min');
    console.log('Max per day:', (17 - 8) * 60 - 60, 'min (450min = 7.5h)');
    console.log('Remaining:', 450 - total, 'min');

    // 未スケジュールの計画を確認
    const unscheduled = await p.planningEntry.findMany({
        where: { planDate: null },
        take: 5,
        select: { id: true, prepMinutes: true, plannedSeconds: true, processingCode: true }
    });
    console.log('\n--- 未スケジュール（最初の5件）---');
    unscheduled.forEach(plan => {
        const mins = plan.prepMinutes + Math.ceil((plan.plannedSeconds || 0) / 60);
        console.log(mins + 'min', plan.processingCode);
    });

    await p.$disconnect();
}

check();
