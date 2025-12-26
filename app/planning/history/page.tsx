import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { MonthSelector } from './MonthSelector'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PlanningEntry {
    id: number
    orderNumber: string | null
    planDate: Date | null
    receptionDate: Date | null
    processingCode: string | null
    processingType: string
    customerCode: string | null
    gardenName: string | null
    position: string | null
    productName: string | null
    size90SS: number | null
    size100S: number | null
    size110M: number | null
    size120L: number | null
    size130LL: number | null
    sizeF: number | null
    size1315: number | null
    size1618: number | null
    size1921: number | null
    size2224: number | null
    sizeOther: number | null
    totalQuantity: number | null
    threadColor: string | null
    baldanTime: string | null
    tajimaTime: string | null
    usedMachine: string
    prepMinutes: number
    deadline: string | null
    plannedSeconds: number | null
    startTime: string | null
    status: string
}

interface Props {
    searchParams: Promise<{ type?: string; month?: string }>
}

export default async function HistoryPage({ searchParams }: Props) {
    const params = await searchParams
    const currentType = params.type || 'embroidery'

    // 今日の日付を取得
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 月の指定がある場合はその月、なければ先月まで
    let startDate: Date
    let endDate: Date

    if (params.month) {
        // YYYY-MM 形式
        const [year, month] = params.month.split('-').map(Number)
        startDate = new Date(year, month - 1, 1)
        endDate = new Date(year, month, 0) // その月の最終日
        endDate.setHours(23, 59, 59, 999)
    } else {
        // デフォルト: 過去30日分
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 30)
        endDate = new Date(today)
        endDate.setDate(endDate.getDate() - 1) // 昨日まで
        endDate.setHours(23, 59, 59, 999)
    }

    const plans = await prisma.planningEntry.findMany({
        where: {
            processingType: currentType,
            planDate: {
                gte: startDate,
                lt: today  // 今日より前
            }
        },
        orderBy: [
            { planDate: 'desc' },
            { startTime: 'asc' }
        ],
        take: 500
    }) as PlanningEntry[]

    // 日付ごとにグループ化
    const grouped: { [key: string]: PlanningEntry[] } = {}
    for (const plan of plans) {
        if (plan.planDate) {
            const dateKey = new Date(plan.planDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                weekday: 'short'
            })
            if (!grouped[dateKey]) grouped[dateKey] = []
            grouped[dateKey].push(plan)
        }
    }

    // 統計（準備時間を含む）
    const completedCount = plans.filter(p => p.status === 'completed').length
    const totalQuantity = plans.reduce((sum, p) => sum + (p.totalQuantity || 0), 0)
    const totalSeconds = plans.reduce((sum, p) => {
        const prepSeconds = (p.prepMinutes || 0) * 60
        const processSeconds = p.plannedSeconds || 0
        return sum + prepSeconds + processSeconds
    }, 0)
    const totalHours = Math.floor(totalSeconds / 3600)
    const totalMins = Math.floor((totalSeconds % 3600) / 60)
    const totalSecs = totalSeconds % 60

    const thStyle = "px-3 py-2 text-left font-bold text-slate-800 bg-slate-100 border border-slate-300 whitespace-nowrap"
    const thCenterStyle = "px-3 py-2 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300 whitespace-nowrap"
    const tdStyle = "px-3 py-2 border border-slate-300 text-sm"
    const tdCenterStyle = "px-3 py-2 border border-slate-300 text-sm text-center"

    // 過去6ヶ月の選択肢を生成
    const monthOptions: { value: string; label: string }[] = []
    for (let i = 0; i < 6; i++) {
        const d = new Date(today)
        d.setMonth(d.getMonth() - i - 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
        monthOptions.push({ value, label })
    }

    return (
        <div className="w-full px-2">
            {/* ヘッダー */}
            <div className="bg-slate-700 text-white rounded-t p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/planning?type=${currentType}`}
                        className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm font-bold"
                    >
                        ← 計画表に戻る
                    </Link>
                    <h2 className="text-2xl font-black">
                        📚 {currentType === 'embroidery' ? '刺繍' : '転写'}加工履歴
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <MonthSelector
                        currentType={currentType}
                        currentMonth={params.month}
                        options={monthOptions}
                    />
                </div>
            </div>

            {/* 統計 */}
            <div className="bg-white border-2 border-slate-300 border-t-0 p-4 mb-4 flex gap-6">
                <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold">期間:</span>
                    <span className="text-lg font-black text-slate-800">
                        {startDate.toLocaleDateString('ja-JP')} 〜 {endDate.toLocaleDateString('ja-JP')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold">完了:</span>
                    <span className="text-lg font-black text-green-600">{completedCount}件</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold">総枚数:</span>
                    <span className="text-lg font-black text-blue-600">{totalQuantity.toLocaleString()}枚</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold">総加工時間:</span>
                    <span className="text-lg font-black text-orange-600">{totalHours}時間{totalMins}分{totalSecs}秒</span>
                </div>
            </div>

            {/* 日付別リスト */}
            {Object.entries(grouped).map(([dateKey, items]) => {
                const dailySeconds = items.reduce((sum, p) => {
                    const prepSeconds = (p.prepMinutes || 0) * 60
                    const processSeconds = p.plannedSeconds || 0
                    return sum + prepSeconds + processSeconds
                }, 0)
                const hours = Math.floor(dailySeconds / 3600)
                const mins = Math.floor((dailySeconds % 3600) / 60)
                const secs = dailySeconds % 60
                const dailyQuantity = items.reduce((sum, p) => sum + (p.totalQuantity || 0), 0)
                const completedItems = items.filter(p => p.status === 'completed').length

                return (
                    <div key={dateKey} className="bg-white border-2 border-slate-300 rounded mb-4 overflow-hidden">
                        <div className="bg-slate-600 text-white px-4 py-3 flex justify-between items-center">
                            <h3 className="font-black text-xl">📅 {dateKey}</h3>
                            <div className="flex gap-6 text-base font-bold">
                                <span className="text-green-300">完了: {completedItems}/{items.length}件</span>
                                <span>{dailyQuantity}枚</span>
                                <span>{hours}時間{mins}分{secs}秒</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className={thCenterStyle}>開始</th>
                                        <th className={thCenterStyle}>終了</th>
                                        <th className={thStyle}>納期</th>
                                        <th className={thStyle}>受注NO</th>
                                        <th className={thStyle}>加工CD</th>
                                        <th className={`${thStyle} min-w-[200px]`}>園名</th>
                                        <th className={`${thStyle} min-w-[100px]`}>位置</th>
                                        <th className={`${thStyle} min-w-[180px]`}>商品名</th>
                                        <th className={`${thCenterStyle} bg-yellow-200 font-black`}>計</th>
                                        <th className={`${thStyle} min-w-[100px]`}>糸色</th>
                                        <th className={`${thCenterStyle} bg-blue-100`}>バルダン</th>
                                        <th className={`${thCenterStyle} bg-green-100`}>タジマ</th>
                                        <th className={thCenterStyle}>使用機</th>
                                        <th className={thStyle}>状態</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {items.map(plan => {
                                        // 終了時間を計算
                                        let endTime = '-'
                                        if (plan.startTime) {
                                            const [h, m] = plan.startTime.split(':').map(Number)
                                            const processingMinutes = Math.ceil((plan.plannedSeconds || 0) / 60)
                                            const totalMinutes = h * 60 + m + plan.prepMinutes + processingMinutes
                                            const endH = Math.floor(totalMinutes / 60)
                                            const endM = totalMinutes % 60
                                            endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
                                        }

                                        return (
                                            <tr
                                                key={plan.id}
                                                className={`hover:bg-slate-50 ${plan.status === 'completed' ? 'bg-green-50' : 'bg-yellow-50'}`}
                                            >
                                                <td className={`${tdCenterStyle} font-bold text-blue-700`}>{plan.startTime || '-'}</td>
                                                <td className={`${tdCenterStyle} font-bold text-orange-700`}>{endTime}</td>
                                                <td className={`${tdStyle} font-semibold`}>{plan.deadline || '-'}</td>
                                                <td className={`${tdStyle} font-semibold`}>{plan.orderNumber || '-'}</td>
                                                <td className={tdStyle}>
                                                    <Link href={`/codes/${plan.processingCode}`} className="text-blue-700 hover:underline font-bold">
                                                        {plan.processingCode || '-'}
                                                    </Link>
                                                </td>
                                                <td className={`${tdStyle} font-bold text-slate-900`}>{plan.gardenName || '-'}</td>
                                                <td className={`${tdStyle} font-semibold text-teal-700`}>{plan.position || '-'}</td>
                                                <td className={tdStyle}>{plan.productName || '-'}</td>
                                                <td className={`${tdCenterStyle} font-black text-lg bg-yellow-100`}>{plan.totalQuantity || '-'}</td>
                                                <td className={`${tdStyle} font-semibold text-amber-700`}>{plan.threadColor || '-'}</td>
                                                <td className={`${tdCenterStyle} font-semibold text-blue-700`}>{plan.baldanTime || '-'}</td>
                                                <td className={`${tdCenterStyle} font-semibold text-green-700`}>{plan.tajimaTime || '-'}</td>
                                                <td className={tdCenterStyle}>
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${plan.usedMachine === 'baldan'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {plan.usedMachine === 'baldan' ? 'バルダン' : 'タジマ'}
                                                    </span>
                                                </td>
                                                <td className={tdStyle}>
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${plan.status === 'completed'
                                                        ? 'bg-green-600 text-white'
                                                        : plan.status === 'in_progress'
                                                            ? 'bg-orange-500 text-white'
                                                            : 'bg-slate-300 text-slate-700'
                                                        }`}>
                                                        {plan.status === 'completed' ? '完了' : plan.status === 'in_progress' ? '加工中' : '未着手'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            })}

            {plans.length === 0 && (
                <div className="bg-white border-2 border-slate-300 rounded p-8 text-center text-slate-600 text-lg font-semibold">
                    この期間の履歴はありません。
                </div>
            )}
        </div>
    )
}
