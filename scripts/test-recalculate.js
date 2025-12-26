// recalculateDayの動作をテスト
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function test() {
    const START_HOUR = 8;
    const BREAK_START = 12 * 60;
    const BREAK_END = 13 * 60;
    const END_HOUR = 17;

    const startOfDay = new Date('2025-12-26');
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date('2025-12-26');
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

    console.log('=== 現在の計画（startTime順）===');
    let nextAvailableMinutes = START_HOUR * 60;

    for (const plan of plans) {
        const processingMinutes = Math.ceil((plan.plannedSeconds || 0) / 60);
        const prepMinutes = plan.prepMinutes || 15;
        const durationMinutes = prepMinutes + processingMinutes;

        // この計画の現在の開始時間
        let currentStartMinutes = START_HOUR * 60;
        if (plan.startTime) {
            const [h, m] = plan.startTime.split(':').map(Number);
            currentStartMinutes = h * 60 + m;
        }

        // 新しい開始時間
        let newStartMinutes = Math.max(currentStartMinutes, nextAvailableMinutes);

        // 休憩時間をスキップ
        if (newStartMinutes < BREAK_START && newStartMinutes + durationMinutes > BREAK_START) {
            newStartMinutes = BREAK_END;
        } else if (newStartMinutes >= BREAK_START && newStartMinutes < BREAK_END) {
            newStartMinutes = BREAK_END;
        }

        const endMinutes = newStartMinutes + durationMinutes;

        console.log(`${plan.processingCode}: 現在=${plan.startTime}, duration=${durationMinutes}min`);
        console.log(`  → nextAvailable=${Math.floor(nextAvailableMinutes / 60)}:${(nextAvailableMinutes % 60).toString().padStart(2, '0')}, Max結果=${Math.floor(newStartMinutes / 60)}:${(newStartMinutes % 60).toString().padStart(2, '0')}, 終了=${Math.floor(endMinutes / 60)}:${(endMinutes % 60).toString().padStart(2, '0')}`);

        nextAvailableMinutes = endMinutes;
    }

    await p.$disconnect();
}

test();
