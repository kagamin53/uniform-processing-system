'use client'

import { useState } from 'react'

interface PlanningEntry {
    id: number
    orderNumber: string | null
    processingCode: string | null
    productName: string | null
    gardenName?: string | null
    totalQuantity: number | null
    usedMachine: string
    baldanTime: string | null
    tajimaTime: string | null
    plannedSeconds: number | null
    prepMinutes: number
    startTime: string | null
    deadline: string | null
    status: string
}

interface TimelineChartProps {
    items: PlanningEntry[]
    dateKey: string
}

// 色パレット（交互に使用）
const COLORS = [
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white' },
    { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-white' },
    { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-white' },
    { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-white' },
    { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-white' },
    { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', text: 'text-white' },
    { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-slate-900' },
    { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white' },
]

export function TimelineChart({ items, dateKey }: TimelineChartProps) {
    const [hoveredTask, setHoveredTask] = useState<PlanningEntry | null>(null)

    const START_HOUR = 8
    const END_HOUR = 17
    const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60 // 540分

    // 時間の配列（8時〜17時）
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

    // マシンごとのタスク
    const baldanTasks = items.filter(i => i.usedMachine === 'baldan' && i.startTime).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
    const tajimaTasks = items.filter(i => i.usedMachine === 'tajima' && i.startTime).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    // 開始時間を分に変換（8:00を0として）
    const timeToMinutes = (time: string | null): number => {
        if (!time) return 0
        const [h, m] = time.split(':').map(Number)
        return (h - START_HOUR) * 60 + m
    }

    // タスクの幅と位置を%で計算
    const getTaskStyle = (task: PlanningEntry) => {
        const startMinutes = timeToMinutes(task.startTime)
        const durationMinutes = task.prepMinutes + Math.ceil((task.plannedSeconds || 0) / 60)

        const leftPercent = (startMinutes / TOTAL_MINUTES) * 100
        const widthPercent = (durationMinutes / TOTAL_MINUTES) * 100

        return {
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 1)}%` // 最小1%
        }
    }

    // 終了時間を計算
    const calcEndTime = (task: PlanningEntry): string => {
        if (!task.startTime) return '-'
        const [h, m] = task.startTime.split(':').map(Number)
        const processingMinutes = Math.ceil((task.plannedSeconds || 0) / 60)
        const totalMinutes = h * 60 + m + task.prepMinutes + processingMinutes
        const endH = Math.floor(totalMinutes / 60)
        const endM = totalMinutes % 60
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
    }

    // タスクバーをレンダリング
    const renderTaskBar = (task: PlanningEntry, index: number) => {
        const style = getTaskStyle(task)
        const color = COLORS[index % COLORS.length]
        const durationMinutes = task.prepMinutes + Math.ceil((task.plannedSeconds || 0) / 60)

        return (
            <div
                key={task.id}
                className={`absolute top-1 bottom-1 rounded ${color.bg} ${color.hover} ${color.text} shadow-md border border-white/30 flex items-center justify-center cursor-pointer transition-all group overflow-hidden`}
                style={style}
                onMouseEnter={() => setHoveredTask(task)}
                onMouseLeave={() => setHoveredTask(null)}
            >
                <span className="text-xs font-bold truncate px-1">{task.processingCode}</span>

                {/* ホバー時のツールチップ */}
                <div className="hidden group-hover:block absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-xs p-3 rounded shadow-xl pointer-events-none">
                    <div className="font-black text-yellow-300 text-base mb-1">{task.processingCode}</div>
                    <div className="text-slate-300 mb-2">{task.gardenName || task.productName}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>数量: <span className="font-bold text-yellow-300">{task.totalQuantity}枚</span></div>
                        <div>時間: <span className="font-bold">{durationMinutes}分</span></div>
                        <div>開始: <span className="font-bold text-green-300">{task.startTime}</span></div>
                        <div>終了: <span className="font-bold text-red-300">{calcEndTime(task)}</span></div>
                    </div>
                </div>
            </div>
        )
    }

    // マシンレーンをレンダリング
    const renderMachineLane = (tasks: PlanningEntry[], machineName: string, bgColor: string, labelColor: string) => (
        <div className={`relative h-16 ${bgColor} border-b-2 border-slate-300`}>
            {/* マシン名ラベル */}
            <div className={`absolute left-0 top-0 bottom-0 w-28 ${labelColor} flex items-center justify-center z-10 border-r-2 border-slate-400`}>
                <span className="font-black text-white text-sm">{machineName}</span>
            </div>
            {/* タスクエリア */}
            <div className="absolute left-28 right-0 top-0 bottom-0">
                {tasks.map((task, i) => renderTaskBar(task, i))}
            </div>
        </div>
    )

    // 合計計算
    const baldanTotal = baldanTasks.reduce((sum, t) => sum + t.prepMinutes + Math.ceil((t.plannedSeconds || 0) / 60), 0)
    const tajimaTotal = tajimaTasks.reduce((sum, t) => sum + t.prepMinutes + Math.ceil((t.plannedSeconds || 0) / 60), 0)
    const baldanQty = baldanTasks.reduce((sum, t) => sum + (t.totalQuantity || 0), 0)
    const tajimaQty = tajimaTasks.reduce((sum, t) => sum + (t.totalQuantity || 0), 0)

    return (
        <div className="bg-white border-2 border-slate-300 rounded overflow-hidden">
            {/* ヘッダー */}
            <div className="p-3 bg-blue-600 flex justify-between items-center">
                <h2 className="text-lg font-black text-white">📊 {dateKey} タイムライン</h2>
                <div className="flex gap-6 text-white text-sm">
                    <div><span className="font-bold">バルダン:</span> {baldanTasks.length}件 / {baldanQty}枚</div>
                    <div><span className="font-bold">タジマ:</span> {tajimaTasks.length}件 / {tajimaQty}枚</div>
                    <div className="font-bold text-yellow-300">合計: {baldanQty + tajimaQty}枚</div>
                </div>
            </div>

            {/* 時間軸ヘッダー */}
            <div className="relative h-8 bg-slate-200 border-b-2 border-slate-400">
                <div className="absolute left-0 w-28 h-full bg-slate-300 border-r-2 border-slate-400 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600">マシン</span>
                </div>
                <div className="absolute left-28 right-0 h-full flex">
                    {hours.map((hour, i) => (
                        <div
                            key={hour}
                            className="flex-1 border-l border-slate-400 flex items-center justify-center relative"
                        >
                            <span className="text-xs font-bold text-slate-700">{hour}:00</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ガントチャート本体 */}
            <div className="relative">
                {/* 時間グリッド線 */}
                <div className="absolute left-28 right-0 top-0 bottom-0 flex pointer-events-none">
                    {hours.map((hour, i) => (
                        <div key={hour} className="flex-1 border-l border-slate-200" />
                    ))}
                </div>

                {/* マシンレーン */}
                {renderMachineLane(baldanTasks, 'バルダン', 'bg-blue-50', 'bg-blue-600')}
                {renderMachineLane(tajimaTasks, 'タジマ', 'bg-green-50', 'bg-green-600')}
            </div>

            {/* 凡例と合計 */}
            <div className="p-4 bg-slate-100 border-t-2 border-slate-300 flex justify-between items-center">
                <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c, i) => (
                        <div key={i} className={`w-4 h-4 rounded ${c.bg}`} />
                    ))}
                    <span className="text-xs text-slate-500 ml-2">= 各工程（色で区別）</span>
                </div>
                <div className="text-lg font-black text-slate-800">
                    総作業時間: {Math.floor((baldanTotal + tajimaTotal) / 60)}時間{(baldanTotal + tajimaTotal) % 60}分
                </div>
            </div>
        </div>
    )
}
