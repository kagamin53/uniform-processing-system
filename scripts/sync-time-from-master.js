// 計画エントリのbaldanTime/tajimaTimeをProcessingCodeマスターから再同期
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 時間文字列を秒に変換
function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)[\u0027\u2019\u02BC](\d+)/);
    if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    const num = parseFloat(timeStr);
    if (!isNaN(num)) return Math.round(num * 60);
    return 0;
}

async function syncTimeFromMaster() {
    console.log('計画エントリの時間データをマスターから再同期中...\n');

    // processingCodeがあり、baldanTime/tajimaTimeがnullの計画エントリを取得
    const plans = await prisma.planningEntry.findMany({
        where: {
            processingCode: { not: null },
            OR: [
                { baldanTime: null },
                { baldanTime: '' }
            ]
        }
    });

    console.log(`対象件数: ${plans.length}件\n`);

    let updated = 0;
    let notFound = 0;
    let noTime = 0;

    for (const plan of plans) {
        if (!plan.processingCode) continue;

        const master = await prisma.processingCode.findUnique({
            where: { code: plan.processingCode }
        });

        if (!master) {
            notFound++;
            continue;
        }

        if (!master.baldanTime && !master.tajimaTime) {
            noTime++;
            continue;
        }

        // 時間を計算
        const baldanSeconds = parseTimeToSeconds(master.baldanTime);
        const tajimaSeconds = parseTimeToSeconds(master.tajimaTime);
        const secondsPerPiece = Math.max(baldanSeconds, tajimaSeconds);
        const plannedSeconds = secondsPerPiece * (plan.totalQuantity || 1);

        await prisma.planningEntry.update({
            where: { id: plan.id },
            data: {
                baldanTime: master.baldanTime,
                tajimaTime: master.tajimaTime,
                plannedSeconds: plannedSeconds > 0 ? plannedSeconds : null
            }
        });

        updated++;
    }

    console.log('=== 結果 ===');
    console.log(`更新成功: ${updated}件`);
    console.log(`マスターなし: ${notFound}件`);
    console.log(`マスターに時間データなし: ${noTime}件`);

    await prisma.$disconnect();
}

syncTimeFromMaster().catch(console.error);
