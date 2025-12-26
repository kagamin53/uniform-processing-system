// Analyze Excel file structure
const XLSX = require('xlsx');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Read master file
const masterPath = path.join(dataDir, '★刺繍コード一覧表.xlsx');
const masterWB = XLSX.readFile(masterPath);
console.log('=== マスターファイル (刺繍コード一覧表) ===');
console.log('シート名:', masterWB.SheetNames);
const masterSheet = masterWB.Sheets[masterWB.SheetNames[0]];
const masterData = XLSX.utils.sheet_to_json(masterSheet, { header: 1 });
console.log('ヘッダー行:', masterData[0]);
console.log('サンプルデータ (2-5行):');
masterData.slice(1, 5).forEach((row, i) => console.log(`  行${i + 2}:`, row));
console.log('総行数:', masterData.length);

console.log('\n');

// Read picking list
const pickingPath = path.join(dataDir, '二次加工ピッキング対象一覧表.xlsx');
const pickingWB = XLSX.readFile(pickingPath);
console.log('=== ピッキング一覧表 ===');
console.log('シート名:', pickingWB.SheetNames);
const pickingSheet = pickingWB.Sheets[pickingWB.SheetNames[0]];
const pickingData = XLSX.utils.sheet_to_json(pickingSheet, { header: 1 });
console.log('ヘッダー行:', pickingData[0]);
console.log('サンプルデータ (2-5行):');
pickingData.slice(1, 5).forEach((row, i) => console.log(`  行${i + 2}:`, row));
console.log('総行数:', pickingData.length);
