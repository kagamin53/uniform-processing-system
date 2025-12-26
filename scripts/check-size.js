const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // ピッキングのサイズデータを確認
    const samples = await prisma.pickingItem.findMany({
        where: { processorCode: { in: ['9901', '9902'] } },
        take: 15,
        select: { id: true, size: true, orderQuantity: true, orderNumber: true, remarks1: true }
    });
    console.log('ピッキングアイテムのサイズ:');
    samples.forEach(s => {
        console.log(`  ID:${s.id} Size:"${s.size}" Qty:${s.orderQuantity} Order:${s.orderNumber}`);
    });

    // 計画表のサイズデータを確認
    const plans = await prisma.planningEntry.findMany({
        take: 5,
        select: {
            id: true,
            size90SS: true, size100S: true, size110M: true, size120L: true, size130LL: true,
            sizeF: true, sizeOther: true, sizeBreakdown: true, totalQuantity: true
        }
    });
    console.log('\n計画表のサイズ:');
    plans.forEach(p => {
        console.log(`  ID:${p.id} 90SS:${p.size90SS} 100S:${p.size100S} 110M:${p.size110M} 120L:${p.size120L} 130LL:${p.size130LL} F:${p.sizeF} Other:${p.sizeOther} Breakdown:"${p.sizeBreakdown}" Total:${p.totalQuantity}`);
    });

    await prisma.$disconnect();
}
check();
