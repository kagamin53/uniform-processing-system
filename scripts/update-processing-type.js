// 既存の計画エントリのprocessingTypeを更新
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProcessingTypes() {
    console.log('計画エントリのprocessingTypeを更新中...');

    // Pで始まる加工CDを「transfer（転写）」に更新
    const transferUpdated = await prisma.planningEntry.updateMany({
        where: {
            processingCode: { startsWith: 'P' }
        },
        data: {
            processingType: 'transfer'
        }
    });
    console.log('転写に更新:', transferUpdated.count, '件');

    // それ以外を「embroidery（刺繍）」に更新（念のため）
    const embroideryUpdated = await prisma.planningEntry.updateMany({
        where: {
            NOT: {
                processingCode: { startsWith: 'P' }
            }
        },
        data: {
            processingType: 'embroidery'
        }
    });
    console.log('刺繍に更新:', embroideryUpdated.count, '件');

    // 確認
    const transferCount = await prisma.planningEntry.count({ where: { processingType: 'transfer' } });
    const embroideryCount = await prisma.planningEntry.count({ where: { processingType: 'embroidery' } });
    console.log('\n現在の件数:');
    console.log('  転写:', transferCount, '件');
    console.log('  刺繍:', embroideryCount, '件');

    await prisma.$disconnect();
}

updateProcessingTypes().catch(console.error);
