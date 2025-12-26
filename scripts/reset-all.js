const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAll() {
    // 計画表のエントリをすべて削除
    const deletedPlans = await prisma.planningEntry.deleteMany({});
    console.log(`計画表: ${deletedPlans.count}件 削除しました`);

    // ピッキングのaddedToPlanをfalseにリセット
    const resetPicking = await prisma.pickingItem.updateMany({
        where: { addedToPlan: true },
        data: { addedToPlan: false }
    });
    console.log(`ピッキング: ${resetPicking.count}件 「済」をリセットしました`);

    await prisma.$disconnect();
}

resetAll();
