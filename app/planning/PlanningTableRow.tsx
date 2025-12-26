'use client'

import { useState, useTransition, memo } from 'react'
import Link from 'next/link'
import { MachineSelect } from './MachineSelect'


interface PlanningEntry {
    id: number
    orderNumber: string | null
    planDate: Date | null
    processingCode: string | null
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
    plannedSeconds: number | null
    startTime: string | null
    deadline: string | null
    status: string
}

interface PlanningTableRowProps {
    plan: PlanningEntry
    index: number
    isDragging: boolean
    isOver: boolean
    onDragStart: (index: number) => void
    onDragOver: (e: React.DragEvent, index: number) => void
    onDragEnd: () => void
    onUpdateStartTime: (id: number, startTime: string) => Promise<{ success?: boolean }>
    onUpdateMachine: (id: number, machine: string) => Promise<{ success?: boolean; error?: string }>
    onUpdatePrepTime: (id: number, prepMinutes: number) => Promise<{ success?: boolean }>
    onUpdateStatus: (id: number, status: string) => Promise<void>
    onUpdateProcessingTime: (id: number, baldanTime: string, tajimaTime: string, syncToMaster: boolean) => Promise<{ success?: boolean }>
    onUpdateDate: (id: number, dateStr: string) => Promise<{ success?: boolean }>
}

function calcEndTime(startTime: string | null, processingSeconds: number | null, prepMinutes: number): string {
    if (!startTime) return '-'
    const [h, m] = startTime.split(':').map(Number)
    const processingMinutes = Math.ceil((processingSeconds || 0) / 60)
    const totalMinutes = h * 60 + m + prepMinutes + processingMinutes
    const endH = Math.floor(totalMinutes / 60)
    const endM = totalMinutes % 60
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
}

function formatTotalTime(processingSeconds: number | null, prepMinutes: number): string {
    const processingMinutes = Math.ceil((processingSeconds || 0) / 60)
    const totalMinutes = prepMinutes + processingMinutes
    if (totalMinutes <= 0) return '-'
    return `${totalMinutes}分`
}

const tdStyle = "px-3 py-2 border border-slate-300 text-sm"
const tdCenterStyle = "px-3 py-2 border border-slate-300 text-sm text-center"

export const PlanningTableRow = memo(function PlanningTableRow({
    plan,
    index,
    isDragging,
    isOver,
    onDragStart,
    onDragOver,
    onDragEnd,
    onUpdateStartTime,
    onUpdateMachine,
    onUpdatePrepTime,
    onUpdateStatus,
    onUpdateProcessingTime,
    onUpdateDate
}: PlanningTableRowProps) {
    // console.log('Rendering PlanningTableRow', { id: plan.id })
    const [isPending, startTransition] = useTransition()

    // 編集ステート (行ごとに独立)
    const [isEditingStartTime, setIsEditingStartTime] = useState(false)
    const [startTimeValue, setStartTimeValue] = useState('')

    const [isEditingPrep, setIsEditingPrep] = useState(false)
    const [prepValue, setPrepValue] = useState('')

    const [isEditingTime, setIsEditingTime] = useState(false)
    const [baldanValue, setBaldanValue] = useState('')
    const [tajimaValue, setTajimaValue] = useState('')
    const [syncToMaster, setSyncToMaster] = useState(true)

    // Handlers
    const handleStartTimeClick = () => {
        setIsEditingStartTime(true)
        setStartTimeValue(plan.startTime || '08:00')
    }

    const handleStartTimeSave = () => {
        startTransition(async () => {
            await onUpdateStartTime(plan.id, startTimeValue)
            setIsEditingStartTime(false)
        })
    }

    const handlePrepTimeClick = () => {
        setIsEditingPrep(true)
        setPrepValue(plan.prepMinutes.toString())
    }

    const handlePrepTimeSave = () => {
        const mins = parseInt(prepValue) || 15
        startTransition(async () => {
            await onUpdatePrepTime(plan.id, mins)
            setIsEditingPrep(false)
        })
    }

    const handleTimeClick = () => {
        setIsEditingTime(true)
        setBaldanValue(plan.baldanTime || '')
        setTajimaValue(plan.tajimaTime || '')
        setSyncToMaster(true)
    }

    const handleTimeSave = () => {
        startTransition(async () => {
            await onUpdateProcessingTime(plan.id, baldanValue, tajimaValue, syncToMaster)
            setIsEditingTime(false)
        })
    }

    return (
        <tr
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/plan-id', plan.id.toString())
                e.dataTransfer.effectAllowed = 'move'
                onDragStart(index)
            }}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`cursor-move transition-all hover:bg-blue-50
                ${isDragging ? 'opacity-50 bg-blue-100' : ''}
                ${isOver ? 'border-t-4 border-t-green-500' : ''}
                ${isPending ? 'opacity-70' : ''}
                ${plan.status === 'completed' ? 'bg-slate-200 opacity-60 grayscale' : ''}
            `}
        >
            <td className={`${tdCenterStyle} bg-blue-50`}>
                {isEditingStartTime ? (
                    <input
                        type="time"
                        value={startTimeValue}
                        onChange={(e) => setStartTimeValue(e.target.value)}
                        onBlur={handleStartTimeSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleStartTimeSave()
                            if (e.key === 'Escape') setIsEditingStartTime(false)
                        }}
                        className="w-24 p-1 text-sm bg-white border-2 border-blue-500 rounded font-bold"
                        autoFocus
                    />
                ) : (
                    <button
                        onClick={handleStartTimeClick}
                        className="font-bold text-blue-700 hover:bg-blue-200 px-2 py-1 rounded"
                    >
                        {plan.startTime || '-'}
                    </button>
                )}
            </td>
            <td className={`${tdCenterStyle} bg-orange-50 font-bold text-orange-700`}>
                {calcEndTime(plan.startTime, plan.plannedSeconds, plan.prepMinutes)}
            </td>
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
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size90SS || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size100S || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size110M || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size120L || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size130LL || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.sizeF || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size1315 || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size1618 || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size1921 || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.size2224 || ''}</td>
            <td className={`${tdCenterStyle} font-semibold`}>{plan.sizeOther || ''}</td>
            <td className={`${tdCenterStyle} font-black text-lg bg-yellow-100`}>{plan.totalQuantity || '-'}</td>
            <td className={`${tdStyle} font-semibold text-amber-700`}>{plan.threadColor || '-'}</td>
            <td className={`${tdCenterStyle} ${isEditingTime ? 'bg-white' : 'bg-blue-50'}`}>
                {isEditingTime ? (
                    <input
                        type="text"
                        value={baldanValue}
                        onChange={(e) => setBaldanValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTimeSave()
                            if (e.key === 'Escape') setIsEditingTime(false)
                        }}
                        className="w-16 p-1 text-sm border-2 border-blue-500 rounded font-bold text-center"
                        placeholder="3'00"
                    />
                ) : (
                    <button
                        onClick={handleTimeClick}
                        className="font-semibold text-blue-700 hover:bg-blue-200 px-2 py-1 rounded w-full h-full block"
                    >
                        {plan.baldanTime || '-'}
                    </button>
                )}
            </td>
            <td className={`${tdCenterStyle} ${isEditingTime ? 'bg-white' : 'bg-green-50'}`}>
                {isEditingTime ? (
                    <div className="flex flex-col items-center gap-1">
                        <input
                            type="text"
                            value={tajimaValue}
                            onChange={(e) => setTajimaValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTimeSave()
                                if (e.key === 'Escape') setIsEditingTime(false)
                            }}
                            className="w-16 p-1 text-sm border-2 border-green-500 rounded font-bold text-center"
                            placeholder="3'00"
                        />
                        <label className="flex items-center gap-1 text-[10px] whitespace-nowrap cursor-pointer select-none bg-yellow-100 px-1 rounded border border-yellow-300">
                            <input
                                type="checkbox"
                                checked={syncToMaster}
                                onChange={(e) => setSyncToMaster(e.target.checked)}
                                className="w-3 h-3"
                            />
                            マスター反映
                        </label>
                        <button
                            onClick={handleTimeSave}
                            className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded hover:bg-slate-700"
                        >
                            保存
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleTimeClick}
                        className="font-semibold text-green-700 hover:bg-green-200 px-2 py-1 rounded w-full h-full block"
                    >
                        {plan.tajimaTime || '-'}
                    </button>
                )}
            </td>
            <td className={tdCenterStyle}>
                <MachineSelect
                    itemId={plan.id}
                    currentMachine={plan.usedMachine}
                    baldanTime={plan.baldanTime}
                    tajimaTime={plan.tajimaTime}
                    updateAction={onUpdateMachine}
                />
            </td>
            <td className={tdCenterStyle}>
                {isEditingPrep ? (
                    <input
                        type="number"
                        value={prepValue}
                        onChange={(e) => setPrepValue(e.target.value)}
                        onBlur={handlePrepTimeSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePrepTimeSave()
                            if (e.key === 'Escape') setIsEditingPrep(false)
                        }}
                        className="w-14 p-1 text-sm bg-white border-2 border-teal-500 rounded text-center font-bold"
                        autoFocus
                        min="0"
                    />
                ) : (
                    <button
                        onClick={handlePrepTimeClick}
                        className="font-semibold text-teal-700 hover:bg-teal-100 px-2 py-1 rounded"
                    >
                        {plan.prepMinutes}分
                    </button>
                )}
            </td>
            <td className={`${tdCenterStyle} font-bold text-orange-700`}>
                {formatTotalTime(plan.plannedSeconds, plan.prepMinutes)}
            </td>
            <td className={tdStyle}>
                <button
                    onClick={() => {
                        startTransition(async () => {
                            const newStatus = plan.status === 'completed' ? 'pending' : 'completed'
                            await onUpdateStatus(plan.id, newStatus)
                        })
                    }}
                    disabled={isPending}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors border ${plan.status === 'completed'
                        ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                        : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300 hover:text-gray-400'
                        }`}
                >
                    完了
                </button>
            </td>
            <td className="px-2 py-2 border border-slate-300">
                <div className="flex items-center justify-center gap-2">
                    <label className="relative cursor-pointer">
                        <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.value) {
                                    startTransition(async () => {
                                        await onUpdateDate(plan.id, e.target.value)
                                    })
                                }
                            }}
                        />
                        <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition font-bold whitespace-nowrap">
                            📅 日付変更
                        </span>
                    </label>
                    <span className="cursor-grab hover:bg-slate-200 p-1 rounded text-slate-400" title="ドラッグで順番変更">⋮⋮</span>
                </div>
            </td>
        </tr>
    )
}, (prev, next) => {
    // インデックスやドラッグ状態が変わっていたら再レンダリング
    if (prev.index !== next.index) return false
    if (prev.isDragging !== next.isDragging) return false
    if (prev.isOver !== next.isOver) return false

    // planの中身を比較
    // オブジェクトの参照は変わるが、中身が同じなら再レンダリングしない
    const keys = Object.keys(prev.plan) as (keyof PlanningEntry)[]
    for (const key of keys) {
        if (prev.plan[key] !== next.plan[key]) {
            return false
        }
    }

    return true
})
