const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePlanningTimes() {
    // 計画エントリを取得
    const plans = await prisma.planningEntry.findMany({
        where: {
            processingCode: { not: null }
        }
    });

    console.log(`${plans.length} 件の計画エントリを更新します...`);

    let updated = 0;
    for (const plan of plans) {
        if (!plan.processingCode) continue;

        // 加工コードマスターから時間を取得
        const codeInfo = await prisma.processingCode.findUnique({
            where: { code: plan.processingCode }
        });

        if (codeInfo && (codeInfo.baldanTime || codeInfo.tajimaTime)) {
            await prisma.planningEntry.update({
                where: { id: plan.id },
                data: {
                    baldanTime: codeInfo.baldanTime,
                    tajimaTime: codeInfo.tajimaTime,
                    threadColor: codeInfo.threadColor || plan.threadColor,
                    costPrice: codeInfo.costPrice || plan.costPrice,
                    sellingPrice: codeInfo.sellingPrice || plan.sellingPrice
                }
            });
            updated++;
        }
    }

    console.log(`${updated} 件の計画エントリを更新しました`);
    await prisma.$disconnect();
}

updatePlanningTimes();
