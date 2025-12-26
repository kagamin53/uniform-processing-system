import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// 重複チェック用のキー生成
function createDuplicateKey(orderNumber: string | null, customerCode: string | null, productCode: string | null, colorCode: string | null, size: string | null, orderQuantity: number | null): string {
    return `${orderNumber || ''}|${customerCode || ''}|${productCode || ''}|${colorCode || ''}|${size || ''}|${orderQuantity || ''}`
}

// Extract processing code from remarks (HA0000 format)
function extractProcessingCode(remarks: any): string | null {
    if (!remarks) return null
    const match = String(remarks).trim().match(/^[A-Z]{2}\d{4}$/)
    return match ? match[0] : null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const items = body.items

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'データが不正です' }, { status: 400 })
        }

        // 1. 既存データの重複キーを一括取得
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
        const batch: any[] = []

        for (const item of items) {
            // メモリ上で高速に重複チェック
            const key = createDuplicateKey(
                item.orderNumber,
                item.customerCode,
                item.productCode,
                item.colorCode,
                item.size,
                item.orderQuantity
            )
            if (existingKeys.has(key)) {
                skipped++
                continue
            }

            // 新規データとして追加、キーをSetに追加（同一バッチ内重複防止）
            existingKeys.add(key)

            const processingCodeStr = extractProcessingCode(item.remarks1)
            const processingCodeId = processingCodeStr ? codeMap.get(processingCodeStr) : null

            batch.push({
                orderDate: item.orderDate ? new Date(item.orderDate) : null,
                orderNumber: item.orderNumber,
                orderLine: item.orderLine,
                pickingNumber: item.pickingNumber,
                customerCode: item.customerCode,
                customerName: item.customerName,
                deliveryCode: item.deliveryCode,
                deliveryName: item.deliveryName,
                shippingDate: item.shippingDate ? new Date(item.shippingDate) : null,
                supplierCode: item.supplierCode,
                supplierName: item.supplierName,
                productCode: item.productCode,
                productName: item.productName,
                colorCode: item.colorCode,
                colorName: item.colorName,
                size: item.size,
                orderQuantity: item.orderQuantity,
                normalShipment: item.normalShipment,
                processingTypeCode: item.processingTypeCode,
                processingType: item.processingType,
                materialCode: item.materialCode,
                materialName: item.materialName,
                positionCode: item.positionCode,
                positionName: item.positionName,
                processorCode: item.processorCode,
                processorName: item.processorName,
                remarks1: item.remarks1,
                materialUsage: item.materialUsage,
                processingCodeId: processingCodeId || null,
                status: 'pending'
            })
        }

        // Insert batch
        if (batch.length > 0) {
            await prisma.pickingItem.createMany({ data: batch })
            imported = batch.length
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
