'use server'

import { prisma } from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

// 時間文字列 (例: "3'45" or "3'45") を秒に変換
// Note: データには通常アポストロフィ(')と右シングル引用符(')の両方が使われる
function parseTimeToSeconds(timeStr: string | null): number {
    if (!timeStr) return 0

    // "3'45" または "3'45" 形式を解析 (分'秒)
    // \u0027 = ', \u2019 = ' (right single quote), \u02BC = ʼ
    const match = timeStr.match(/(\d+)[\u0027\u2019\u02BC](\d+)/)
    if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        return minutes * 60 + seconds
    }

    // 数値のみの場合（分として扱う）
    const num = parseFloat(timeStr)
    if (!isNaN(num)) return Math.round(num * 60)

    return 0
}

export async function updatePickingStatus(formData: FormData) {
    const ids = formData.getAll('ids').map(id => parseInt(id as string))
    const status = formData.get('status') as string

    if (ids.length === 0) return

    await prisma.pickingItem.updateMany({
        where: { id: { in: ids } },
        data: { status }
    })

    revalidatePath('/picking')
    revalidatePath('/')
}

export async function updateSinglePickingStatus(id: number, status: string) {
    await prisma.pickingItem.update({
        where: { id },
        data: { status }
    })

    revalidatePath('/picking')
    revalidatePath('/')
}

// チェックされたピッキングを計画表に追加（同一受注No・得意先CD・加工CDをまとめる）
export async function addToPlan(formData: FormData) {
    const ids = formData.getAll('pickingIds').map(id => parseInt(id as string))
    const planDate = formData.get('planDate') as string

    if (ids.length === 0) return { error: '項目を選択してください' }

    // 選択されたピッキングアイテムを取得（まだ計画に追加されていないもののみ）
    const pickingItems = await prisma.pickingItem.findMany({
        where: {
            id: { in: ids },
            addedToPlan: false
        },
        include: { processingCode: true }
    })

    if (pickingItems.length === 0) {
        return { error: '選択された項目は既に計画表に追加されています' }
    }

    // 受注No・得意先CD・加工CDでグループ化
    const groups: Map<string, typeof pickingItems> = new Map()

    for (const item of pickingItems) {
        // 加工CDを抽出
        let procCode = item.processingCode?.code || null
        if (!procCode && item.remarks1) {
            const cleaned = item.remarks1.replace(/\s+/g, '').toUpperCase()
            const match = cleaned.match(/^([A-Z]{2}\d{4})/)
            if (match) procCode = match[1]
        }

        const groupKey = `${item.orderNumber || ''}_${item.customerCode || ''}_${procCode || ''}`

        if (!groups.has(groupKey)) {
            groups.set(groupKey, [])
        }
        groups.get(groupKey)!.push(item)
    }

    let createdCount = 0

    // グループごとに計画エントリを作成
    for (const [_, groupItems] of groups) {
        const firstItem = groupItems[0]

        // 加工CDから工程情報を取得
        let processingInfo = firstItem.processingCode
        if (!processingInfo && firstItem.remarks1) {
            const cleaned = firstItem.remarks1.replace(/\s+/g, '').toUpperCase()
            const match = cleaned.match(/^([A-Z]{2}\d{4})/)
            if (match) {
                processingInfo = await prisma.processingCode.findUnique({
                    where: { code: match[1] }
                })
            }
        }

        // サイズ内訳を作成（例: "90:2,100:3,110:1"）
        const sizeMap: Map<string, number> = new Map()
        let totalQty = 0

        for (const item of groupItems) {
            const size = item.size || '不明'
            const qty = item.orderQuantity || 0
            sizeMap.set(size, (sizeMap.get(size) || 0) + qty)
            totalQty += qty
        }

        // サイズ順にソート
        const sizeBreakdown = Array.from(sizeMap.entries())
            .sort((a, b) => {
                const numA = parseInt(a[0]) || 9999
                const numB = parseInt(b[0]) || 9999
                return numA - numB
            })
            .map(([size, qty]) => `${size}:${qty}`)
            .join(',')

        // バルダン/タジマ時間を取得
        const baldanTime = processingInfo?.baldanTime || null
        const tajimaTime = processingInfo?.tajimaTime || null

        // 所要時間を計算（秒）: 時間 × 総枚数
        const baldanSeconds = parseTimeToSeconds(baldanTime)
        const tajimaSeconds = parseTimeToSeconds(tajimaTime)
        const secondsPerPiece = Math.max(baldanSeconds, tajimaSeconds)
        const plannedSeconds = secondsPerPiece * totalQty

        // サイズをカテゴリに分類
        const sizeCounts = {
            size90SS: 0,  // 90, SS
            size100S: 0,  // 100, S
            size110M: 0,  // 110, M
            size120L: 0,  // 120, L
            size130LL: 0, // 130, LL
            sizeF: 0,     // F, フリー
            size1315: 0,  // 13-15
            size1618: 0,  // 16-18
            size1921: 0,  // 19-21
            size2224: 0,  // 22-24
            sizeOther: 0  // その他
        }

        for (const [size, qty] of sizeMap) {
            const s = size.toUpperCase().trim()
            if (s === '90' || s === 'SS') sizeCounts.size90SS += qty
            else if (s === '100' || s === 'S') sizeCounts.size100S += qty
            else if (s === '110' || s === 'M') sizeCounts.size110M += qty
            else if (s === '120' || s === 'L') sizeCounts.size120L += qty
            else if (s === '130' || s === 'LL') sizeCounts.size130LL += qty
            else if (s === 'F' || s === 'フリー' || s === 'FREE') sizeCounts.sizeF += qty
            else if (s === '13-15' || s === '13' || s === '15') sizeCounts.size1315 += qty
            else if (s === '16-18' || s === '16' || s === '18') sizeCounts.size1618 += qty
            else if (s === '19-21' || s === '19' || s === '21') sizeCounts.size1921 += qty
            else if (s === '22-24' || s === '22' || s === '24') sizeCounts.size2224 += qty
            else sizeCounts.sizeOther += qty
        }

        // 計画エントリを作成
        await prisma.planningEntry.create({
            data: {
                orderNumber: firstItem.orderNumber || null,
                planDate: planDate ? new Date(planDate) : null,
                receptionDate: firstItem.orderDate,
                returnDate: firstItem.shippingDate ? new Date(firstItem.shippingDate).toLocaleDateString('ja-JP') : null,
                processingCode: processingInfo?.code || firstItem.remarks1?.replace(/\s+/g, '').match(/^([A-Z]{2}\d{4}|P\d+)/)?.[1] || null,
                customerCode: firstItem.customerCode || processingInfo?.customerCode || null,
                city: processingInfo?.city || null,
                gardenName: firstItem.customerName || processingInfo?.customerName || null,
                position: processingInfo?.position || firstItem.positionName || null,
                productCode: firstItem.productCode || processingInfo?.productCode || null,
                productName: firstItem.productName || processingInfo?.productName || null,
                colorCode: firstItem.colorCode || processingInfo?.colorCode || null,
                colorName: firstItem.colorName || processingInfo?.colorName || null,
                size90SS: sizeCounts.size90SS || null,
                size100S: sizeCounts.size100S || null,
                size110M: sizeCounts.size110M || null,
                size120L: sizeCounts.size120L || null,
                size130LL: sizeCounts.size130LL || null,
                sizeF: sizeCounts.sizeF || null,
                size1315: sizeCounts.size1315 || null,
                size1618: sizeCounts.size1618 || null,
                size1921: sizeCounts.size1921 || null,
                size2224: sizeCounts.size2224 || null,
                sizeOther: sizeCounts.sizeOther || null,
                sizeBreakdown: sizeBreakdown,
                totalQuantity: totalQty,
                costPrice: processingInfo?.costPrice || null,
                sellingPrice: processingInfo?.sellingPrice || null,
                threadColor: processingInfo?.threadColor || null,
                baldanTime: baldanTime,
                tajimaTime: tajimaTime,
                prepMinutes: processingInfo?.prepMinutes ?? 15,
                deadline: firstItem.shippingDate ? new Date(firstItem.shippingDate).toLocaleDateString('ja-JP') : null,
                plannedSeconds: plannedSeconds > 0 ? plannedSeconds : null,
                notes: processingInfo?.notes || firstItem.processingType || null,
                // 加工タイプを判定: マスターのtype → コード先頭判定 → デフォルト
                processingType: processingInfo?.type ||
                    ((processingInfo?.code || '').toUpperCase().startsWith('P') ? 'transfer' : 'embroidery'),
                status: 'pending'
            }
        })
        createdCount++

        // ピッキングアイテムを計画追加済みとしてマーク
        for (const item of groupItems) {
            await prisma.pickingItem.update({
                where: { id: item.id },
                data: { addedToPlan: true }
            })
        }
    }

    revalidatePath('/planning')
    revalidatePath('/picking')

    return { success: true, count: createdCount, itemsProcessed: pickingItems.length }
}
