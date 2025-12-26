const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicates() {
    console.log('重複データを削除します...');

    // 重複を検出（orderNumber + orderLine の組み合わせで重複を判定）
    const duplicates = await prisma.$queryRaw`
        SELECT orderNumber, orderLine, MIN(id) as keepId, COUNT(*) as count
        FROM PickingItem
        GROUP BY orderNumber, orderLine
        HAVING COUNT(*) > 1
    `;

    console.log(`${duplicates.length}個の重複グループを検出`);

    let deletedCount = 0;
    for (const dup of duplicates) {
        // 最初のレコード以外を削除
        const deleted = await prisma.pickingItem.deleteMany({
            where: {
                orderNumber: dup.orderNumber,
                orderLine: dup.orderLine,
                id: { not: Number(dup.keepId) }
            }
        });
        deletedCount += deleted.count;
    }

    console.log(`${deletedCount}件の重複レコードを削除しました`);

    // 削除後の総数
    const total = await prisma.pickingItem.count();
    console.log(`残りのピッキングアイテム総数: ${total}`);

    const selfProcessing = await prisma.pickingItem.count({
        where: { processorCode: { in: ['9901', '9902'] } }
    });
    console.log(`自社加工アイテム: ${selfProcessing}`);

    await prisma.$disconnect();
}

removeDuplicates();
