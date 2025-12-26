import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import * as XLSX from 'xlsx'

// ファイルサイズ制限を50MBに設定
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Parse Japanese date
function parseJapaneseDate(dateStr: any): Date | null {
    if (!dateStr) return null
    if (dateStr instanceof Date) return dateStr

    // Handle "2023年 1月18日" format
    const match = String(dateStr).match(/(\d+)年\s*(\d+)月\s*(\d+)日/)
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
    }

    // Try standard date parsing
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
}

// Extract processing code from remarks (HA0000 format)
function extractProcessingCode(remarks: any): string | null {
    if (!remarks) return null
    const match = String(remarks).trim().match(/^[A-Z]{2}\d{4}$/)
    return match ? match[0] : null
}

// 重複チェック用のキー生成
function createDuplicateKey(orderNumber: string | null, customerCode: string | null, productCode: string | null, colorCode: string | null, size: string | null, orderQuantity: number | null): string {
    return `${orderNumber || ''}|${customerCode || ''}|${productCode || ''}|${colorCode || ''}|${size || ''}|${orderQuantity || ''}`
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'ファイルが指定されていません' }, { status: 400 })
        }

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })

        // Get first sheet (or Sheet1)
        const sheetName = workbook.SheetNames.includes('Sheet1') ? 'Sheet1' : workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        // Row 3 is headers (0-indexed: row[2]), data starts from row 4
        const rows = data.slice(3)

        // 1. 既存データの重複キーを一括取得（高速化）
        const existingItems = await prisma.pickingItem.findMany({
            select: {
                orderNumber: true,
                customerCode: true,
                productCode: true,
                colorCode: true,
                size: true,
                orderQuantity: true
            }
        })

        // 重複チェック用Setを作成
        const existingKeys = new Set<string>()
        for (const item of existingItems) {
            existingKeys.add(createDuplicateKey(
                item.orderNumber,
                item.customerCode,
                item.productCode,
                item.colorCode,
                item.size,
                item.orderQuantity
            ))
        }

        // Get processing code id map
        const codeMap = new Map<string, number>()
        const codes = await prisma.processingCode.findMany({ select: { id: true, code: true } })
        codes.forEach(c => codeMap.set(c.code, c.id))

        let imported = 0
        let skipped = 0
        const BATCH_SIZE = 500
        let batch: any[] = []

        for (const row of rows) {
            if (!row[0]) {
                continue
            }

            // Extract key fields for duplicate check
            const orderNumber = row[1] ? String(row[1]) : null
            const customerCode = row[4] ? String(row[4]) : null
            const productCode = row[11] ? String(row[11]) : null
            const colorCode = row[13] ? String(row[13]) : null
            const size = row[15] ? String(row[15]) : null
            const orderQuantity = typeof row[16] === 'number' ? row[16] : null

            // メモリ上で高速に重複チェック
            const key = createDuplicateKey(orderNumber, customerCode, productCode, colorCode, size, orderQuantity)
            if (existingKeys.has(key)) {
                skipped++
                continue
            }

            // 新規データとして追加、キーをSetに追加（同一ファイル内重複防止）
            existingKeys.add(key)

            const remarks1 = row[26]
            const processingCodeStr = extractProcessingCode(remarks1)
            const processingCodeId = processingCodeStr ? codeMap.get(processingCodeStr) : null

            batch.push({
                orderDate: parseJapaneseDate(row[0]),
                orderNumber,
                orderLine: typeof row[2] === 'number' ? row[2] : null,
                pickingNumber: typeof row[3] === 'number' ? row[3] : null,
                customerCode,
                customerName: row[5] ? String(row[5]) : null,
                deliveryCode: row[6] ? String(row[6]) : null,
                deliveryName: row[7] ? String(row[7]) : null,
                shippingDate: parseJapaneseDate(row[8]),
                supplierCode: row[9] ? String(row[9]) : null,
                supplierName: row[10] ? String(row[10]) : null,
                productCode,
                productName: row[12] ? String(row[12]) : null,
                colorCode,
                colorName: row[14] ? String(row[14]) : null,
                size,
                orderQuantity,
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
                processingCodeId: processingCodeId || null,
                status: 'pending'
            })

            if (batch.length >= BATCH_SIZE) {
                await prisma.pickingItem.createMany({ data: batch })
                imported += batch.length
                batch = []
            }
        }

        // Insert remaining
        if (batch.length > 0) {
            await prisma.pickingItem.createMany({ data: batch })
            imported += batch.length
        }

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            message: `${imported}件追加、${skipped}件スキップ（重複）`
        })

    } catch (error) {
        console.error('Import error:', error)
        return NextResponse.json(
            { error: 'インポート中にエラーが発生しました', details: String(error) },
            { status: 500 }
        )
    }
}
