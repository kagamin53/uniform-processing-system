'use server'

import { prisma } from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

// 休日を追加/削除（トグル）
export async function toggleHoliday(dateStr: string, name?: string) {
    // YYYY-MM-DD形式から年月日を抽出してUTC正午で作成（タイムゾーンずれを防止）
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))

    // 検索用の範囲を設定（その日のUTC 0:00〜23:59）
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

    // その日が既に休日かチェック
    const existing = await prisma.holiday.findFirst({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    })

    if (existing) {
        // 既存なら削除
        await prisma.holiday.delete({
            where: { id: existing.id }
        })
    } else {
        // なければ追加
        await prisma.holiday.create({
            data: {
                date: date,
                name: name || null
            }
        })
    }

    revalidatePath('/calendar')
    revalidatePath('/planning')

    return { success: true }
}

// 休日名を更新
export async function updateHolidayName(dateStr: string, name: string) {
    const [year, month, day] = dateStr.split('-').map(Number)
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

    const existing = await prisma.holiday.findFirst({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    })

    if (existing) {
        await prisma.holiday.update({
            where: { id: existing.id },
            data: { name: name || null }
        })
    }

    revalidatePath('/calendar')

    return { success: true }
}

// 月の休日一覧を取得
export async function getHolidaysForMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { date: 'asc' }
    })

    return holidays
}

// 全休日を取得（スケジュール用）
export async function getAllHolidays() {
    const holidays = await prisma.holiday.findMany({
        orderBy: { date: 'asc' }
    })
    return holidays
}

// 日付が休日かチェック
export async function isHoliday(date: Date): Promise<boolean> {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    const holiday = await prisma.holiday.findFirst({
        where: { date: targetDate }
    })

    return holiday !== null
}
