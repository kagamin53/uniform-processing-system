import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { updatePlanningStatus } from '@/app/orders-list/actions'
import { OrderStatusSelect } from '@/app/orders-list/StatusSelect'
import { ScheduleButtons } from './ScheduleButtons'
import { MachineSelect } from './MachineSelect'
import { updateMachine, updateStartTime, updatePrepTime, reorderPlanning, updateProcessingTime, updatePlanDate } from './schedule-actions'
import { PlanningTableClient } from './PlanningTableClient'
import { DateHeaderDropZone } from './DateHeaderDropZone'
import { DragAutoScroll } from './DragAutoScroll'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handleStatusUpdate(id: number, status: string) {
    'use server'
    await updatePlanningStatus(id, status)
}

async function handleMachineUpdate(id: number, machine: string) {
    'use server'
    return await updateMachine(id, machine)
}

async function handleStartTimeUpdate(id: number, startTime: string) {
    'use server'
    return await updateStartTime(id, startTime)
}

async function handlePrepTimeUpdate(id: number, prepMinutes: number) {
    'use server'
    return await updatePrepTime(id, prepMinutes)
}

async function handleProcessingTimeUpdate(id: number, baldanTime: string, tajimaTime: string, syncToMaster: boolean) {
    'use server'
    return await updateProcessingTime(id, baldanTime, tajimaTime, syncToMaster)
}

async function handleDateUpdate(id: number, dateStr: string) {
    'use server'
    return await updatePlanDate(id, dateStr)
}

async function handleReorder(dateKey: string, orderedIds: number[]) {
    'use server'
    return await reorderPlanning(dateKey, orderedIds)
}

interface PlanningEntry {
    id: number
    orderNumber: string | null
    planDate: Date | null
    receptionDate: Date | null
    returnDate: string | null
    processingCode: string | null
    processingType: string
    customerCode: string | null
    gardenName: string | null
    position: string | null
    productName: string | null
    colorName: string | null
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
    sizeBreakdown: string | null
    totalQuantity: number | null
    threadColor: string | null
    baldanTime: string | null
    tajimaTime: string | null
    usedMachine: string
    prepMinutes: number
    deadline: string | null
    plannedSeconds: number | null
    startTime: string | null
    notes: string | null
    status: string
}

// 集約用: 加工CD, 得意先CD, 納期が一致するエントリをまとめる
function aggregateEntries(entries: PlanningEntry[]): PlanningEntry[] {
    const aggregated = new Map<string, PlanningEntry>()

    for (const entry of entries) {
        const key = `${entry.processingCode || ''}_${entry.customerCode || ''}_${entry.deadline || ''}`

        if (aggregated.has(key)) {
            const existing = aggregated.get(key)!
            // 受注NOを結合
            const existingOrders = existing.orderNumber || ''
            const newOrder = entry.orderNumber || ''
            if (newOrder && !existingOrders.includes(newOrder)) {
                existing.orderNumber = existingOrders ? `${existingOrders}, ${newOrder}` : newOrder
            }
            // サイズ別枚数を合算
            existing.size90SS = (existing.size90SS || 0) + (entry.size90SS || 0)
            existing.size100S = (existing.size100S || 0) + (entry.size100S || 0)
            existing.size110M = (existing.size110M || 0) + (entry.size110M || 0)
            existing.size120L = (existing.size120L || 0) + (entry.size120L || 0)
            existing.size130LL = (existing.size130LL || 0) + (entry.size130LL || 0)
            existing.sizeF = (existing.sizeF || 0) + (entry.sizeF || 0)
            existing.size1315 = (existing.size1315 || 0) + (entry.size1315 || 0)
            existing.size1618 = (existing.size1618 || 0) + (entry.size1618 || 0)
            existing.size1921 = (existing.size1921 || 0) + (entry.size1921 || 0)
            existing.size2224 = (existing.size2224 || 0) + (entry.size2224 || 0)
            existing.sizeOther = (existing.sizeOther || 0) + (entry.sizeOther || 0)
            existing.totalQuantity = (existing.totalQuantity || 0) + (entry.totalQuantity || 0)
            // 加工時間を合算
            existing.plannedSeconds = (existing.plannedSeconds || 0) + (entry.plannedSeconds || 0)
        } else {
            // 新規エントリ（コピーして追加）
            aggregated.set(key, { ...entry })
        }
    }

    return Array.from(aggregated.values())
}

interface Props {
    searchParams: Promise<{ type?: string }>
}

export default async function PlanningPage({ searchParams }: Props) {
    const params = await searchParams
    const currentType = params.type || 'embroidery'

    // 今日の開始時刻を取得（日本時間）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 3ヶ月先までの休日を取得
    const threeMonthsLater = new Date(today)
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: today,
                lte: threeMonthsLater
            }
        }
    })

    // 休日の日付セット（YYYY-MM-DD形式）
    const holidayDates = new Set(
        holidays.map(h => {
            const d = new Date(h.date)
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        })
    )

    const plans = await prisma.planningEntry.findMany({
        where: {
            processingType: currentType,
            OR: [
                { planDate: { gte: today } },  // 今日以降
                { planDate: null }              // 未スケジュール
            ]
        },
        orderBy: [
            { planDate: 'asc' },
            { deadline: 'asc' }
        ],
        take: 500
    }) as PlanningEntry[]

    // plansから直接カウント（追加クエリなし）
    const pendingCount = plans.filter(p => p.status === 'pending').length
    const inProgressCount = plans.filter(p => p.status === 'in_progress').length
    const totalCount = plans.length

    const grouped: { [key: string]: { items: PlanningEntry[], isHoliday: boolean, dateISO: string } } = {}
    const unscheduled: PlanningEntry[] = []

    for (const plan of plans) {
        if (plan.planDate) {
            const planDateObj = new Date(plan.planDate)
            const dateKey = planDateObj.toLocaleDateString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                weekday: 'short'
            })
            const dateISO = `${planDateObj.getFullYear()}-${String(planDateObj.getMonth() + 1).padStart(2, '0')}-${String(planDateObj.getDate()).padStart(2, '0')}`

            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    items: [],
                    isHoliday: holidayDates.has(dateISO),
                    dateISO: dateISO
                }
            }
            grouped[dateKey].items.push(plan)
        } else {
            unscheduled.push(plan)
        }
    }

    // 各日付のエントリを集約してからソート
    for (const key of Object.keys(grouped)) {
        const aggregatedItems = aggregateEntries(grouped[key].items)
        aggregatedItems.sort((a, b) => {
            const timeA = a.startTime || '99:99'
            const timeB = b.startTime || '99:99'
            return timeA.localeCompare(timeB)
        })
        grouped[key].items = aggregatedItems
    }

    const getDailySeconds = (items: PlanningEntry[]) => {
        return items.reduce((sum, p) => {
            const prepSeconds = (p.prepMinutes || 0) * 60
            const processSeconds = p.plannedSeconds || 0
            return sum + prepSeconds + processSeconds
        }, 0)
    }

    // シンプルなテーブルヘッダースタイル
    const thStyle = "px-3 py-2 text-left font-bold text-slate-800 bg-slate-100 border border-slate-300 whitespace-nowrap"
    const thCenterStyle = "px-3 py-2 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300 whitespace-nowrap"

    return (
        <div className="w-full px-2">
            {/* ドラッグ中の自動スクロール */}
            <DragAutoScroll />
            {/* タブ切り替え */}
            <div className="flex gap-0 mb-0">
                <Link
                    href="/planning?type=embroidery"
                    className={`px-8 py-3 font-black text-lg rounded-t border-2 border-b-0 transition ${currentType === 'embroidery'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                >
                    🧵 刺繍
                </Link>
                <Link
                    href="/planning?type=transfer"
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
                    <h2 className="text-2xl font-black text-slate-800">
                        📋 {currentType === 'embroidery' ? '刺繍' : '転写'}計画表
                    </h2>
                    <ScheduleButtons />
                    <Link
                        href={`/planning/history?type=${currentType}`}
                        className="px-4 py-2 bg-slate-500 text-white font-bold rounded hover:bg-slate-600 transition-colors text-sm"
                    >
                        📚 履歴
                    </Link>
                </div>
                <div className="flex gap-3 text-base font-bold">
                    <span className="px-4 py-2 bg-yellow-200 text-yellow-900 border-2 border-yellow-400 rounded">未着手: {pendingCount}</span>
                    <span className="px-4 py-2 bg-orange-200 text-orange-900 border-2 border-orange-400 rounded">加工中: {inProgressCount}</span>
                    <span className="px-4 py-2 bg-slate-200 text-slate-700 border-2 border-slate-400 rounded">全 {totalCount} 件</span>
                </div>
            </div>

            {/* 日付別リスト */}
            {Object.entries(grouped).map(([dateKey, { items, isHoliday, dateISO }]) => {
                const dailySeconds = getDailySeconds(items)
                const hours = Math.floor(dailySeconds / 3600)
                const mins = Math.floor((dailySeconds % 3600) / 60)
                const secs = dailySeconds % 60
                const maxSeconds = 450 * 60
                return (
                    <DateHeaderDropZone
                        key={dateKey}
                        dateKey={dateKey}
                        dateISO={dateISO}
                        isHoliday={isHoliday}
                        itemCount={items.length}
                        hours={hours}
                        mins={mins}
                        secs={secs}
                        maxSeconds={maxSeconds}
                        dailySeconds={dailySeconds}
                        onDropPlan={handleDateUpdate}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className={`${thCenterStyle} bg-blue-200`}>開始</th>
                                        <th className={`${thCenterStyle} bg-blue-200`}>終了</th>
                                        <th className={thStyle}>納期</th>
                                        <th className={thStyle}>受注NO</th>
                                        <th className={thStyle}>加工CD</th>
                                        <th className={`${thStyle} min-w-[200px]`}>園名</th>
                                        <th className={`${thStyle} min-w-[100px]`}>位置</th>
                                        <th className={`${thStyle} min-w-[180px]`}>商品名</th>
                                        <th className={thCenterStyle}>90/SS</th>
                                        <th className={thCenterStyle}>100/S</th>
                                        <th className={thCenterStyle}>110/M</th>
                                        <th className={thCenterStyle}>120/L</th>
                                        <th className={thCenterStyle}>130/LL</th>
                                        <th className={thCenterStyle}>F</th>
                                        <th className={thCenterStyle}>13-15</th>
                                        <th className={thCenterStyle}>16-18</th>
                                        <th className={thCenterStyle}>19-21</th>
                                        <th className={thCenterStyle}>22-24</th>
                                        <th className={thCenterStyle}>他</th>
                                        <th className={`${thCenterStyle} bg-yellow-200 font-black`}>計</th>
                                        <th className={`${thStyle} min-w-[100px]`}>糸色</th>
                                        <th className={`${thCenterStyle} bg-blue-100`}>バルダン</th>
                                        <th className={`${thCenterStyle} bg-green-100`}>タジマ</th>
                                        <th className={thCenterStyle}>使用機</th>
                                        <th className={thCenterStyle}>準備</th>
                                        <th className={thCenterStyle}>合計</th>
                                        <th className={thStyle}>状態</th>
                                        <th className={`${thStyle} w-10`}></th>
                                    </tr>
                                </thead>
                                <PlanningTableClient
                                    items={items}
                                    dateKey={dateKey}
                                    onReorder={handleReorder}
                                    onUpdateStartTime={handleStartTimeUpdate}
                                    onUpdateMachine={handleMachineUpdate}
                                    onUpdatePrepTime={handlePrepTimeUpdate}
                                    onUpdateStatus={handleStatusUpdate}
                                    onUpdateProcessingTime={handleProcessingTimeUpdate}
                                    onUpdateDate={handleDateUpdate}
                                />
                            </table>
                        </div>
                    </DateHeaderDropZone>
                )
            })}

            {/* 未スケジュール項目 */}
            {unscheduled.length > 0 && (
                <div className="bg-white border-2 border-slate-300 rounded mb-4 overflow-hidden">
                    <div className="bg-slate-600 text-white px-4 py-3 flex justify-between items-center">
                        <h3 className="font-black text-xl">📋 未スケジュール</h3>
                        <span className="text-base font-bold">{unscheduled.length}件</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className={thStyle}>受注No</th>
                                    <th className={thStyle}>受注日</th>
                                    <th className={thStyle}>得意先CD</th>
                                    <th className={thStyle}>加工CD</th>
                                    <th className={thStyle}>園名</th>
                                    <th className={thStyle}>位置</th>
                                    <th className={thStyle}>商品名</th>
                                    <th className={thCenterStyle}>90/SS</th>
                                    <th className={thCenterStyle}>100/S</th>
                                    <th className={thCenterStyle}>110/M</th>
                                    <th className={thCenterStyle}>120/L</th>
                                    <th className={thCenterStyle}>130/LL</th>
                                    <th className={thCenterStyle}>F</th>
                                    <th className={thCenterStyle}>13-15</th>
                                    <th className={thCenterStyle}>16-18</th>
                                    <th className={thCenterStyle}>19-21</th>
                                    <th className={thCenterStyle}>22-24</th>
                                    <th className={thCenterStyle}>他</th>
                                    <th className={`${thCenterStyle} bg-yellow-200 font-black`}>計</th>
                                    <th className={thStyle}>糸色</th>
                                    <th className={`${thCenterStyle} bg-blue-100`}>バルダン</th>
                                    <th className={`${thCenterStyle} bg-green-100`}>タジマ</th>
                                    <th className={thCenterStyle}>使用機</th>
                                    <th className={thStyle}>納期</th>
                                    <th className={thStyle}>状態</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {unscheduled.slice(0, 50).map(plan => (
                                    <tr key={plan.id} className="border border-slate-300 hover:bg-blue-50">
                                        <td className="px-3 py-2 border border-slate-300 font-semibold">{plan.orderNumber || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300">
                                            {plan.receptionDate ? new Date(plan.receptionDate).toLocaleDateString('ja-JP') : '-'}
                                        </td>
                                        <td className="px-3 py-2 border border-slate-300">{plan.customerCode || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300">
                                            <Link href={`/codes/${plan.processingCode}`} className="text-blue-700 hover:underline font-bold">
                                                {plan.processingCode || '-'}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2 border border-slate-300 font-bold text-slate-900">{plan.gardenName || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300 font-semibold text-teal-700">{plan.position || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300">{plan.productName || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size90SS || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size100S || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size110M || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size120L || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size130LL || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.sizeF || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size1315 || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size1618 || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size1921 || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.size2224 || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold">{plan.sizeOther || ''}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-black text-lg bg-yellow-100">{plan.totalQuantity || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300 font-semibold text-amber-700">{plan.threadColor || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold text-blue-700">{plan.baldanTime || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center font-semibold text-green-700">{plan.tajimaTime || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300 text-center">
                                            <MachineSelect
                                                itemId={plan.id}
                                                currentMachine={plan.usedMachine}
                                                baldanTime={plan.baldanTime}
                                                tajimaTime={plan.tajimaTime}
                                                updateAction={handleMachineUpdate}
                                            />
                                        </td>
                                        <td className="px-3 py-2 border border-slate-300 font-semibold">{plan.deadline || '-'}</td>
                                        <td className="px-3 py-2 border border-slate-300">
                                            <OrderStatusSelect
                                                itemId={plan.id}
                                                currentStatus={plan.status}
                                                updateAction={handleStatusUpdate}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {unscheduled.length > 50 && (
                            <div className="p-4 text-center text-slate-600 text-base font-semibold bg-slate-100 border-t-2 border-slate-300">
                                他 {unscheduled.length - 50}件 ...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {plans.length === 0 && (
                <div className="bg-white border-2 border-slate-300 rounded p-8 text-center text-slate-600 text-lg font-semibold">
                    まだ計画がありません。ピッキング一覧から追加してください。
                </div>
            )}
        </div>
    )
}
