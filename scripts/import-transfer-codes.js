// 転写コード一覧表のインポート
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importTransferCodes() {
    console.log('転写コード一覧表をインポート中...');

    const wb = xlsx.readFile('data/transfer/★転写コード一覧表.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

    // ヘッダー行を取得
    const headers = data[0];
    console.log('ヘッダー:', headers);

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const code = row[0]?.toString().trim();

        if (!code) continue;

        // Pで始まるコードのみを処理
        if (!code.match(/^P\d+/i)) {
            skipped++;
            continue;
        }

        const codeData = {
            code: code,
            type: 'transfer', // 転写
            customerCode: row[1]?.toString().trim() || null,
            city: row[2]?.toString().trim() || null,
            customerName: row[3]?.toString().trim() || null,
            position: row[4]?.toString().trim() || null,
            productCode: row[5]?.toString().trim() || null,
            productName: row[6]?.toString().trim() || null,
            modelNumber: row[7]?.toString().trim() || null,
            colorCode: row[8]?.toString().trim() || null,
            colorName: row[9]?.toString().trim() || null,
            processTime: row[11]?.toString().trim() || null, // 加工工程時期
            costPrice: parseInt(row[12]) || null, // 実費
            sellingPrice: parseInt(row[13]) || null, // 売値
            threadColor: row[14]?.toString().trim() || null, // 使用転写紙
            notes: row[17]?.toString().trim() || null, // 備考
            // 転写は機械時間がないので固定値を設定
            baldanTime: null,
            tajimaTime: null,
            prepMinutes: 10 // 転写は準備時間を10分とする（刺繍より短い）
        };

        try {
            // 既存のコードを確認
            const existing = await prisma.processingCode.findUnique({
                where: { code: code }
            });

            if (existing) {
                // 更新
                await prisma.processingCode.update({
                    where: { code: code },
                    data: codeData
                });
                updated++;
            } else {
                // 新規作成
                await prisma.processingCode.create({
                    data: codeData
                });
                imported++;
            }
        } catch (error) {
            console.error(`エラー (${code}):`, error.message);
        }
    }

    console.log(`\n完了!`);
    console.log(`  新規インポート: ${imported}件`);
    console.log(`  更新: ${updated}件`);
    console.log(`  スキップ: ${skipped}件`);

    await prisma.$disconnect();
}

importTransferCodes().catch(console.error);
