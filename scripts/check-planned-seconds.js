// plannedSecondsを確認
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const plans = await prisma.planningEntry.findMany({
        where: { planDate: { not: null } },
        select: {
            id: true,
            processingCode: true,
            plannedSeconds: true,
            baldanTime: true,
            tajimaTime: true,
            totalQuantity: true
        },
        take: 15
    });

    console.log('=== スケジュール済みデータ (最初の15件) ===');
    for (const p of plans) {
        console.log(`ID:${p.id} code:${p.processingCode} plannedSec:${p.plannedSeconds} baldan:${p.baldanTime} tajima:${p.tajimaTime} qty:${p.totalQuantity}`);
    }

    const nullCount = await prisma.planningEntry.count({
        where: { planDate: { not: null }, plannedSeconds: null }
    });
    const hasValueCount = await prisma.planningEntry.count({
        where: { planDate: { not: null }, plannedSeconds: { not: null } }
    });

    console.log('\n=== 統計 ===');
    console.log('plannedSeconds が null:', nullCount, '件');
    console.log('plannedSeconds に値あり:', hasValueCount, '件');

    await prisma.$disconnect();
}

check();
