// 過去の納期のPickingItemをOrderEntryに移動
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function migrate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`=== 納期が ${today.toISOString().split('T')[0]} より前のPickingItemを移動 ===`);

    // 過去の納期のPickingItemを取得
    const oldItems = await p.pickingItem.findMany({
        where: {
            processorCode: { in: ['9901', '9902'] },
            shippingDate: { lt: today }
        }
    });

    console.log(`移動対象: ${oldItems.length} 件`);

    if (oldItems.length === 0) {
        console.log('移動対象がありません');
        await p.$disconnect();
        return;
    }

    let created = 0;
    for (const item of oldItems) {
        // OrderEntryにデータを作成
        await p.orderEntry.create({
            data: {
                receptionDate: item.orderDate,
                completionDate: item.shippingDate ? item.shippingDate.toISOString().split('T')[0] : null,
                processingCode: item.remarks1, // 備考①に加工CDが入っている
                customerCode: item.customerCode,
                customerName: item.customerName || item.deliveryName,
                position: item.positionName,
                productCode: item.productCode,
                productName: item.productName,
                colorCode: item.colorCode,
                colorName: item.colorName,
                totalQuantity: item.orderQuantity,
                status: item.status === 'completed' || item.status === 'shipped' ? 'completed' : 'pending'
            }
        });
        created++;
    }

    console.log(`OrderEntryに ${created} 件作成完了`);

    // 移動したPickingItemを削除
    const deleted = await p.pickingItem.deleteMany({
        where: {
            processorCode: { in: ['9901', '9902'] },
            shippingDate: { lt: today }
        }
    });

    console.log(`PickingItemから ${deleted.count} 件削除完了`);
    console.log('=== 移動完了 ===');

    await p.$disconnect();
}

migrate().catch(console.error);
