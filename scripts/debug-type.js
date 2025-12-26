// 特定のエントリのprocessingTypeを確認
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const codes = ['HA0983', 'HA1152', 'HA1755', 'HA1805'];

    console.log('=== 特定コードのprocessingType確認 ===');
    for (const code of codes) {
        const entries = await prisma.planningEntry.findMany({
            where: { processingCode: code },
            select: { id: true, processingCode: true, processingType: true, planDate: true }
        });
        entries.forEach(e => console.log(e.id, e.processingCode, e.processingType, e.planDate?.toLocaleDateString('ja-JP')));
    }

    console.log('\n=== 転写タブに表示されるはずのデータ ===');
    const transfer = await prisma.planningEntry.findMany({
        where: { processingType: 'transfer' },
        select: { id: true, processingCode: true, processingType: true }
    });
    transfer.forEach(e => console.log(e.id, e.processingCode, e.processingType));

    await prisma.$disconnect();
}

check();
