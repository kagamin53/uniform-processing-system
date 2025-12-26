import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { CalendarClient } from './CalendarClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
    searchParams: Promise<{ year?: string; month?: string }>
}

export default async function CalendarPage({ searchParams }: Props) {
    const params = await searchParams

    // 現在の年月を取得
    const today = new Date()
    const year = params.year ? parseInt(params.year) : today.getFullYear()
    const month = params.month ? parseInt(params.month) : today.getMonth() + 1

    // 前月・翌月の計算
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    // 休日データを取得
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

    // 全休日数を取得
    const totalHolidays = await prisma.holiday.count()

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/planning"
                            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-bold"
                        >
                            ← 計画表
                        </Link>
                        <h1 className="text-3xl font-black">📅 休日カレンダー</h1>
                    </div>
                    <div className="text-lg font-bold">
                        設定済み休日: <span className="text-yellow-300">{totalHolidays}日</span>
                    </div>
                </div>
            </div>

            {/* 月ナビゲーション */}
            <div className="bg-white border-2 border-t-0 border-slate-300 p-4 flex justify-between items-center">
                <Link
                    href={`/calendar?year=${prevYear}&month=${prevMonth}`}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700"
                >
                    ← 前月
                </Link>
                <h2 className="text-2xl font-black text-slate-800">
                    {year}年 {month}月
                </h2>
                <Link
                    href={`/calendar?year=${nextYear}&month=${nextMonth}`}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700"
                >
                    翌月 →
                </Link>
            </div>

            {/* 使い方 */}
            <div className="bg-yellow-50 border-2 border-t-0 border-yellow-200 p-4 text-yellow-800">
                <span className="font-bold">💡 使い方:</span> 日付をクリックで休日ON/OFF切り替え。休日名をクリックで名前を編集できます。
            </div>

            {/* カレンダー */}
            <CalendarClient
                year={year}
                month={month}
                holidays={holidays.map(h => ({
                    ...h,
                    date: new Date(h.date)
                }))}
            />

            {/* 説明 */}
            <div className="mt-4 bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                <h3 className="font-black text-slate-800 mb-2">🚫 休日の効果</h3>
                <ul className="text-slate-600 space-y-1">
                    <li>• <strong>自動スケジュール</strong>: 休日には計画が割り当てられません</li>
                    <li>• <strong>日付移動</strong>: 休日への移動は可能ですが、警告が表示されます</li>
                    <li>• <strong>計画表</strong>: 休日は赤色でハイライトされます</li>
                </ul>
            </div>
        </div>
    )
}
