const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 時間文字列 (例: "0'46" or "0'46") を秒に変換
// ' = U+0027, ' = U+2019 (right single quotation mark)
function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;

    // 両方の引用符に対応（Unicode直接指定）
    // \u0027 = ', \u2019 = '
    const match = timeStr.match(/(\d+)[\u0027\u2019\u02BC](\d+)/);
    if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        return minutes * 60 + seconds;
    }

    // 数値のみの場合
    const num = parseFloat(timeStr);
    if (!isNaN(num)) return Math.round(num * 60);

    return 0;
}

async function updatePlanningTimes() {
    // すべての計画エントリを更新
    const plans = await prisma.planningEntry.findMany();

    console.log(`${plans.length}件の計画エントリをチェック...`);

    let updated = 0;
    for (const plan of plans) {
        const baldanSeconds = parseTimeToSeconds(plan.baldanTime);
        const tajimaSeconds = parseTimeToSeconds(plan.tajimaTime);
        const secondsPerPiece = Math.max(baldanSeconds, tajimaSeconds);
        const quantity = plan.totalQuantity || 1;
        const plannedSeconds = secondsPerPiece * quantity;

        if (plannedSeconds > 0 && plan.plannedSeconds !== plannedSeconds) {
            console.log(`ID ${plan.id}: ${plan.processingCode} - ${quantity}枚 × ${secondsPerPiece}秒 = ${plannedSeconds}秒 (${Math.floor(plannedSeconds / 60)}分${plannedSeconds % 60}秒)`);
            await prisma.planningEntry.update({
                where: { id: plan.id },
                data: { plannedSeconds }
            });
            updated++;
        }
    }

    console.log(`\n${updated}件を更新しました`);
    await prisma.$disconnect();
}

updatePlanningTimes();
