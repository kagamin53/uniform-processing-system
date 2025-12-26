const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicatesFast() {
    console.log('重複データを高速削除します（約1-2分）...');
    console.time('削除処理');

    // SQLで一括削除（各orderNumber+orderLineの最小IDのみ残す）
    const result = await prisma.$executeRaw`
        DELETE FROM PickingItem 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM PickingItem 
            GROUP BY orderNumber, orderLine
        )
    `;

    console.timeEnd('削除処理');
    console.log(`${result}件の重複レコードを削除しました`);

    // 削除後の総数
    const total = await prisma.pickingItem.count();
    console.log(`残りのピッキングアイテム総数: ${total}`);

    const selfProcessing = await prisma.pickingItem.count({
        where: { processorCode: { in: ['9901', '9902'] } }
    });
    console.log(`自社加工アイテム: ${selfProcessing}`);

    await prisma.$disconnect();
}

removeDuplicatesFast();
