// 全データの状況を詳細確認
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('=== 全計画エントリ確認 ===');

    const all = await prisma.planningEntry.findMany({
        select: {
            id: true,
            processingCode: true,
            processingType: true,
            planDate: true
        },
        orderBy: { id: 'asc' }
    });

    console.log('総件数:', all.length);

    const embroidery = all.filter(x => x.processingType === 'embroidery');
    const transfer = all.filter(x => x.processingType === 'transfer');
    const other = all.filter(x => x.processingType !== 'embroidery' && x.processingType !== 'transfer');

    console.log('刺繍(embroidery)件数:', embroidery.length);
    console.log('転写(transfer)件数:', transfer.length);
    console.log('その他件数:', other.length);

    if (other.length > 0) {
        console.log('\n=== その他のタイプ ===');
        other.forEach(x => console.log(x.id, x.processingCode, x.processingType));
    }

    // Hで始まるが転写になっているデータ
    const wrongTransfer = transfer.filter(x => x.processingCode && x.processingCode.startsWith('H'));
    if (wrongTransfer.length > 0) {
        console.log('\n=== Hで始まるが転写になっている ===');
        wrongTransfer.forEach(x => console.log(x.id, x.processingCode, x.processingType));
    }

    // Pで始まるが刺繍になっているデータ
    const wrongEmbroidery = embroidery.filter(x => x.processingCode && x.processingCode.startsWith('P'));
    if (wrongEmbroidery.length > 0) {
        console.log('\n=== Pで始まるが刺繍になっている ===');
        wrongEmbroidery.forEach(x => console.log(x.id, x.processingCode, x.processingType));
    }

    // processingTypeがnullのデータ
    const nullType = all.filter(x => !x.processingType);
    if (nullType.length > 0) {
        console.log('\n=== processingTypeがnull/空 ===');
        nullType.forEach(x => console.log(x.id, x.processingCode, x.processingType));
    }

    await prisma.$disconnect();
}

check();
