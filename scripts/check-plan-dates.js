// 計画データの日付状況を確認
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const plans = await p.planningEntry.findMany({
        where: { planDate: { not: null } },
        take: 30,
        orderBy: { planDate: 'asc' },
        select: { id: true, planDate: true, processingCode: true, processingType: true }
    });

    console.log('=== 計画データの日付 ===');
    plans.forEach(p => {
        const dateStr = p.planDate ? p.planDate.toISOString().split('T')[0] : 'null';
        console.log(`ID:${p.id} 日付:${dateStr} コード:${p.processingCode} タイプ:${p.processingType}`);
    });

    await p.$disconnect();
}

check();
