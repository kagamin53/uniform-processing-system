const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
    // 受注番号でグループ化して重複を確認
    const result = await prisma.$queryRaw`
        SELECT orderNumber, COUNT(*) as count 
        FROM PickingItem 
        WHERE processorCode IN ('9901', '9902')
        GROUP BY orderNumber 
        HAVING COUNT(*) > 1
        LIMIT 10
    `;
    console.log('重複した受注番号:', result);

    // サンプルの重複データを表示
    if (result.length > 0) {
        const sampleOrder = result[0].orderNumber;
        const items = await prisma.pickingItem.findMany({
            where: {
                orderNumber: sampleOrder,
                processorCode: { in: ['9901', '9902'] }
            },
            select: {
                id: true,
                orderNumber: true,
                orderLine: true,
                customerName: true,
                productName: true,
                size: true,
                colorName: true,
                orderQuantity: true
            }
        });
        console.log('\nサンプル重複データ:');
        items.forEach(i => console.log(JSON.stringify(i)));
    }

    // 総数
    const total = await prisma.pickingItem.count({
        where: { processorCode: { in: ['9901', '9902'] } }
    });
    console.log('\n自社加工アイテム総数:', total);

    await prisma.$disconnect();
}

checkDuplicates();
