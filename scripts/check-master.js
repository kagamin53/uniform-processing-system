// ProcessingCodeマスターを確認
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // マスターからいくつかのコードを取得
    const codes = await prisma.processingCode.findMany({
        where: {
            OR: [
                { code: { startsWith: 'P' } },  // 転写
                { code: { startsWith: 'H' } }   // 刺繍
            ]
        },
        select: {
            code: true,
            baldanTime: true,
            tajimaTime: true,
            type: true
        },
        take: 20
    });

    console.log('=== ProcessingCodeマスター (サンプル) ===');
    for (const c of codes) {
        console.log(`code:${c.code} baldan:${c.baldanTime || 'null'} tajima:${c.tajimaTime || 'null'} type:${c.type}`);
    }

    // 計画表にあるコードでマスターにないものを確認
    console.log('\n=== 計画表で使用されているコード ===');
    const planCodes = await prisma.planningEntry.findMany({
        where: { planDate: { not: null } },
        select: { processingCode: true },
        distinct: ['processingCode'],
        take: 20
    });

    for (const p of planCodes) {
        if (!p.processingCode) {
            console.log('processingCode: null');
            continue;
        }
        const master = await prisma.processingCode.findUnique({
            where: { code: p.processingCode },
            select: { baldanTime: true, tajimaTime: true }
        });
        if (master) {
            console.log(`${p.processingCode} -> baldan:${master.baldanTime || 'null'} tajima:${master.tajimaTime || 'null'}`);
        } else {
            console.log(`${p.processingCode} -> マスターなし!`);
        }
    }

    await prisma.$disconnect();
}

check();
