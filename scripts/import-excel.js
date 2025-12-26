// Import Excel data to database
const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dataDir = path.join(__dirname, '..', 'data');

// Parse Japanese date
function parseJapaneseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    // Handle "2023年 1月18日" format
    const match = String(dateStr).match(/(\d+)年\s*(\d+)月\s*(\d+)日/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }

    // Try standard date parsing
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

// Extract processing code from remarks (HA0000 format)
function extractProcessingCode(remarks) {
    if (!remarks) return null;
    const match = String(remarks).trim().match(/^[A-Z]{2}\d{4}$/);
    return match ? match[0] : null;
}

async function importMasterData() {
    console.log('=== マスターデータ (刺繍コード一覧表) インポート開始 ===');

    const masterPath = path.join(dataDir, '★刺繍コード一覧表.xlsx');
    const workbook = XLSX.readFile(masterPath);
    const sheet = workbook.Sheets['コード一覧表'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip header rows (row 1 is empty labels, row 2 is actual headers)
    const headers = data[1];
    const rows = data.slice(2);

    let imported = 0;
    let skipped = 0;
    const codeSet = new Set();

    for (const row of rows) {
        const code = row[0]; // 刺繍CD
        if (!code || typeof code !== 'string' || !code.match(/^[A-Z]{2}\d{4}$/)) {
            skipped++;
            continue;
        }

        // Skip duplicates
        if (codeSet.has(code)) {
            skipped++;
            continue;
        }
        codeSet.add(code);

        try {
            await prisma.processingCode.upsert({
                where: { code },
                update: {
                    customerCode: row[1] ? String(row[1]) : null,
                    city: row[2] ? String(row[2]) : null,
                    customerName: row[3] ? String(row[3]) : null,
                    position: row[4] ? String(row[4]) : null,
                    productCode: row[5] ? String(row[5]) : null,
                    productName: row[6] ? String(row[6]) : null,
                    modelNumber: row[7] ? String(row[7]) : null,
                    colorCode: row[8] ? String(row[8]) : null,
                    colorName: row[9] ? String(row[9]) : null,
                    processTime: row[11] ? String(row[11]) : null,
                    costPrice: typeof row[12] === 'number' ? row[12] : null,
                    sellingPrice: typeof row[13] === 'number' ? row[13] : null,
                    threadColor: row[14] ? String(row[14]) : null,
                    baldanTime: row[15] ? String(row[15]) : null,
                    tajimaTime: row[16] ? String(row[16]) : null,
                    notes: row[18] ? String(row[18]) : null,
                },
                create: {
                    code: code,
                    customerCode: row[1] ? String(row[1]) : null,
                    city: row[2] ? String(row[2]) : null,
                    customerName: row[3] ? String(row[3]) : null,
                    position: row[4] ? String(row[4]) : null,
                    productCode: row[5] ? String(row[5]) : null,
                    productName: row[6] ? String(row[6]) : null,
                    modelNumber: row[7] ? String(row[7]) : null,
                    colorCode: row[8] ? String(row[8]) : null,
                    colorName: row[9] ? String(row[9]) : null,
                    processTime: row[11] ? String(row[11]) : null,
                    costPrice: typeof row[12] === 'number' ? row[12] : null,
                    sellingPrice: typeof row[13] === 'number' ? row[13] : null,
                    threadColor: row[14] ? String(row[14]) : null,
                    baldanTime: row[15] ? String(row[15]) : null,
                    tajimaTime: row[16] ? String(row[16]) : null,
                    notes: row[18] ? String(row[18]) : null,
                }
            });
            imported++;

            if (imported % 500 === 0) {
                console.log(`  ${imported} 件インポート済み...`);
            }
        } catch (e) {
            console.error(`Error importing ${code}:`, e.message);
            skipped++;
        }
    }

    console.log(`マスターデータ完了: ${imported} 件インポート, ${skipped} 件スキップ`);
    return codeSet;
}

async function importPickingData(masterCodes) {
    console.log('\n=== ピッキングデータ インポート開始 ===');

    const pickingPath = path.join(dataDir, '二次加工ピッキング対象一覧表.xlsx');
    const workbook = XLSX.readFile(pickingPath);
    const sheet = workbook.Sheets['Sheet1'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Row 3 is headers (0-indexed: row[2])
    const rows = data.slice(3);

    // Get processing code id map
    const codeMap = new Map();
    const codes = await prisma.processingCode.findMany({ select: { id: true, code: true } });
    codes.forEach(c => codeMap.set(c.code, c.id));

    let imported = 0;
    let skipped = 0;
    const BATCH_SIZE = 1000;
    let batch = [];

    for (const row of rows) {
        if (!row[0]) {
            skipped++;
            continue;
        }

        const remarks1 = row[26]; // 備考①
        const processingCodeStr = extractProcessingCode(remarks1);
        const processingCodeId = processingCodeStr ? codeMap.get(processingCodeStr) : null;

        batch.push({
            orderDate: parseJapaneseDate(row[0]),
            orderNumber: row[1] ? String(row[1]) : null,
            orderLine: typeof row[2] === 'number' ? row[2] : null,
            pickingNumber: typeof row[3] === 'number' ? row[3] : null,
            customerCode: row[4] ? String(row[4]) : null,
            customerName: row[5] ? String(row[5]) : null,
            deliveryCode: row[6] ? String(row[6]) : null,
            deliveryName: row[7] ? String(row[7]) : null,
            shippingDate: parseJapaneseDate(row[8]),
            supplierCode: row[9] ? String(row[9]) : null,
            supplierName: row[10] ? String(row[10]) : null,
            productCode: row[11] ? String(row[11]) : null,
            productName: row[12] ? String(row[12]) : null,
            colorCode: row[13] ? String(row[13]) : null,
            colorName: row[14] ? String(row[14]) : null,
            size: row[15] ? String(row[15]) : null,
            orderQuantity: typeof row[16] === 'number' ? row[16] : null,
            normalShipment: row[17] ? String(row[17]) : null,
            processingTypeCode: row[18] ? String(row[18]) : null,
            processingType: row[19] ? String(row[19]) : null,
            materialCode: row[20] ? String(row[20]) : null,
            materialName: row[21] ? String(row[21]) : null,
            positionCode: row[22] ? String(row[22]) : null,
            positionName: row[23] ? String(row[23]) : null,
            processorCode: row[24] ? String(row[24]) : null,
            processorName: row[25] ? String(row[25]) : null,
            remarks1: remarks1 ? String(remarks1) : null,
            materialUsage: typeof row[27] === 'number' ? row[27] : null,
            processingCodeId: processingCodeId,
            status: 'pending'
        });

        if (batch.length >= BATCH_SIZE) {
            await prisma.pickingItem.createMany({ data: batch });
            imported += batch.length;
            console.log(`  ${imported} 件インポート済み...`);
            batch = [];
        }
    }

    // Insert remaining
    if (batch.length > 0) {
        await prisma.pickingItem.createMany({ data: batch });
        imported += batch.length;
    }

    console.log(`ピッキングデータ完了: ${imported} 件インポート, ${skipped} 件スキップ`);
}

async function main() {
    console.log('Excelインポート開始...\n');

    try {
        const masterCodes = await importMasterData();
        await importPickingData(masterCodes);

        console.log('\n=== インポート完了 ===');

        const codeCount = await prisma.processingCode.count();
        const pickingCount = await prisma.pickingItem.count();
        console.log(`加工コード: ${codeCount} 件`);
        console.log(`ピッキング: ${pickingCount} 件`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
