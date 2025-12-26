// recalculateDayを手動で実行してDBを更新
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

async function recalculateDay(targetDate) {
    const BREAK_START = 12 * 60;
    const BREAK_END = 13 * 60;
    const START_HOUR = 8;
    const END_HOUR = 17;

    const planDate = new Date(targetDate);
    const startOfDay = new Date(planDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(planDate);
    endOfDay.setHours(23, 59, 59, 999);

    const plans = await p.planningEntry.findMany({
        where: {
            planDate: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        orderBy: { startTime: 'asc' }
    });

    console.log(`=== ${targetDate} の計画を再計算 (${plans.length}件) ===`);

    let nextAvailableMinutes = START_HOUR * 60;

    for (const plan of plans) {
        const processingMinutes = Math.ceil((plan.plannedSeconds || 0) / 60);
        const prepMinutes = plan.prepMinutes || 15;
        const durationMinutes = prepMinutes + processingMinutes;

        let currentStartMinutes = START_HOUR * 60;
        if (plan.startTime) {
            const [h, m] = plan.startTime.split(':').map(Number);
            currentStartMinutes = h * 60 + m;
        }

        let newStartMinutes = Math.max(currentStartMinutes, nextAvailableMinutes);

        if (newStartMinutes < BREAK_START && newStartMinutes + durationMinutes > BREAK_START) {
            newStartMinutes = BREAK_END;
        } else if (newStartMinutes >= BREAK_START && newStartMinutes < BREAK_END) {
            newStartMinutes = BREAK_END;
        }

        if (newStartMinutes + durationMinutes > END_HOUR * 60) {
            console.log(`${plan.processingCode}: あふれ！ スキップ`);
            continue;
        }

        const startTimeStr = minutesToTime(newStartMinutes);

        if (plan.startTime !== startTimeStr) {
            console.log(`${plan.processingCode}: ${plan.startTime} → ${startTimeStr} に更新`);
            await p.planningEntry.update({
                where: { id: plan.id },
                data: { startTime: startTimeStr }
            });
        } else {
            console.log(`${plan.processingCode}: ${plan.startTime} 変更なし`);
        }

        nextAvailableMinutes = newStartMinutes + durationMinutes;
    }

    console.log('=== 完了 ===');
}

async function main() {
    await recalculateDay('2025-12-26');
    await p.$disconnect();
}

main();
