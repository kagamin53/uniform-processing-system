// マスター未登録の計画エントリを詳細調査
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
    console.log('=== マスター未登録コード分析 ===\n');

    // 計画表で使用されているコードを全て取得
    const planCodes = await prisma.planningEntry.findMany({
        where: { processingCode: { not: null } },
        select: { processingCode: true },
        distinct: ['processingCode']
    });

    const missingCodes = [];
    const noTimeCodes = [];
    const okCodes = [];

    for (const p of planCodes) {
        const master = await prisma.processingCode.findUnique({
            where: { code: p.processingCode },
            select: { code: true, baldanTime: true, tajimaTime: true, type: true }
        });

        if (!master) {
            missingCodes.push(p.processingCode);
        } else if (!master.baldanTime && !master.tajimaTime) {
            noTimeCodes.push(p.processingCode);
        } else {
            okCodes.push(p.processingCode);
        }
    }

    console.log(`正常: ${okCodes.length}件`);
    console.log(`マスター未登録: ${missingCodes.length}件`);
    console.log(`時間未設定: ${noTimeCodes.length}件\n`);

    if (missingCodes.length > 0) {
        console.log('--- マスター未登録コード ---');
        missingCodes.forEach(c => console.log(`  ${c}`));
    }

    if (noTimeCodes.length > 0) {
        console.log('\n--- 時間未設定コード ---');
        noTimeCodes.forEach(c => console.log(`  ${c}`));
    }

    await prisma.$disconnect();
}

analyze().catch(console.error);
