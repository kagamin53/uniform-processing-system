import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { TimelineChart } from './TimelineChart'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TimelinePage({ searchParams }: PageProps) {
    const params = await searchParams

    // 日付指定がない場合は今日をデフォルトに
    const today = new Date()
    const defaultDate = today.toISOString().split('T')[0]

    // クエリパラメータから日付、ビューモード、タイプを取得
    const dateKey = typeof params?.date === 'string' ? params.date : defaultDate
    const viewMode = typeof params?.view === 'string' && params.view === 'week' ? 'week' : 'day'
    const currentType = typeof params?.type === 'string' ? params.type : 'embroidery'

    let prevLink = ''
    let nextLink = ''
    let dateRangeLabel = ''
    let charts = []

    if (viewMode === 'day') {
        const currentDate = new Date(dateKey)
        const prevDate = new Date(currentDate)
        prevDate.setDate(prevDate.getDate() - 1)
        const nextDate = new Date(currentDate)
        nextDate.setDate(nextDate.getDate() + 1)

        prevLink = `/planning/timeline?date=${prevDate.toISOString().split('T')[0]}&view=day&type=${currentType}`
        nextLink = `/planning/timeline?date=${nextDate.toISOString().split('T')[0]}&view=day&type=${currentType}`
        dateRangeLabel = dateKey

        // その日の計画を取得（タイプでフィルタリング）
        const startOfDay = new Date(dateKey)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(dateKey)
        endOfDay.setHours(23, 59, 59, 999)

        const plans = await prisma.planningEntry.findMany({
            where: {
                planDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                processingType: currentType
            },
            orderBy: { startTime: 'asc' }
        })

        charts.push(
            <div key={dateKey} className="mb-4">
                <TimelineChart items={plans} dateKey={dateKey} />
            </div>
        )
    } else {
        // 週表示
        const startDate = new Date(dateKey)
        const prevWeek = new Date(startDate)
        prevWeek.setDate(prevWeek.getDate() - 7)
        const nextWeek = new Date(startDate)
        nextWeek.setDate(nextWeek.getDate() + 7)

        prevLink = `/planning/timeline?date=${prevWeek.toISOString().split('T')[0]}&view=week&type=${currentType}`
        nextLink = `/planning/timeline?date=${nextWeek.toISOString().split('T')[0]}&view=week&type=${currentType}`

        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6)
        dateRangeLabel = `${dateKey} 〜 ${endDate.toISOString().split('T')[0]}`

        // 7日分ループ
        for (let i = 0; i < 7; i++) {
            const current = new Date(startDate)
            current.setDate(current.getDate() + i)
            const currentKey = current.toISOString().split('T')[0]

            const startOfDay = new Date(currentKey)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(currentKey)
            endOfDay.setHours(23, 59, 59, 999)

            // 日ごとにクエリを発行（N+1だが、7回固定なので許容）
            const plans = await prisma.planningEntry.findMany({
                where: {
                    planDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    processingType: currentType
                },
                orderBy: { startTime: 'asc' }
            })

            charts.push(
                <div key={currentKey} className="mb-4">
                    <TimelineChart items={plans} dateKey={currentKey} />
                </div>
            )
        }
    }

    return (
        <div className="w-full px-4">
            {/* タブ切り替え */}
            <div className="flex gap-0 mb-0">
                <Link
                    href={`/planning/timeline?date=${dateKey}&view=${viewMode}&type=embroidery`}
                    className={`px-8 py-3 font-black text-lg rounded-t border-2 border-b-0 transition ${currentType === 'embroidery'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                >
                    🧵 刺繍
                </Link>
                <Link
                    href={`/planning/timeline?date=${dateKey}&view=${viewMode}&type=transfer`}
                    className={`px-8 py-3 font-black text-lg rounded-t border-2 border-b-0 transition ${currentType === 'transfer'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                >
                    🖨️ 転写
                </Link>
            </div>

            {/* ヘッダー */}
            <div className={`border-2 rounded-b rounded-tr p-4 mb-4 flex justify-between items-center ${currentType === 'embroidery'
                ? 'bg-white border-blue-600 border-t-4'
                : 'bg-white border-green-600 border-t-4'
                }`}>
                <div className="flex items-center gap-4">
                    <Link href={`/planning?type=${currentType}`} className="px-4 py-2 bg-slate-200 text-slate-700 rounded border border-slate-400 hover:bg-slate-300 transition font-semibold flex items-center gap-2">
                        ← 計画表に戻る
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800">
                        📊 {currentType === 'embroidery' ? '刺繍' : '転写'}ガントチャート
                    </h1>
                </div>

                {/* 表示切り替え */}
                <div className="flex bg-slate-100 rounded border border-slate-300 p-1">
                    <Link
                        href={`/planning/timeline?date=${dateKey}&view=day&type=${currentType}`}
                        className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        日
                    </Link>
                    <Link
                        href={`/planning/timeline?date=${dateKey}&view=week&type=${currentType}`}
                        className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        週
                    </Link>
                </div>

                {/* 日付ナビゲーション */}
                <div className="flex items-center gap-4 bg-white border-2 border-slate-300 p-2 rounded">
                    <Link
                        href={prevLink}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 font-bold"
                    >
                        ◀
                    </Link>

                    <div className="flex flex-col items-center min-w-[200px]">
                        <span className="text-xs text-slate-500 font-semibold">{viewMode === 'day' ? '表示中の日付' : '表示中の期間'}</span>
                        <span className="text-lg font-black text-slate-800">{dateRangeLabel}</span>
                    </div>

                    <Link
                        href={nextLink}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600 font-bold"
                    >
                        ▶
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                {charts}
            </div>

            <div className="mt-4 text-center text-slate-500 text-sm font-semibold bg-white border border-slate-200 rounded p-2">
                ※ 8:00 〜 17:00 の稼働状況を表示しています
            </div>
        </div>
    )
}

