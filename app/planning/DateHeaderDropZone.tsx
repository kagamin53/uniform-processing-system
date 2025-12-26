'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DateHeaderDropZoneProps {
    dateKey: string
    dateISO: string
    isHoliday: boolean
    itemCount: number
    hours: number
    mins: number
    secs: number
    maxSeconds: number
    dailySeconds: number
    onDropPlan: (planId: number, newDateISO: string) => Promise<{ success?: boolean }>
    children: React.ReactNode
}

export function DateHeaderDropZone({
    dateKey,
    dateISO,
    isHoliday,
    itemCount,
    hours,
    mins,
    secs,
    maxSeconds,
    dailySeconds,
    onDropPlan,
    children
}: DateHeaderDropZoneProps) {
    const router = useRouter()
    const [isDropTarget, setIsDropTarget] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        const planId = e.dataTransfer.types.includes('application/plan-id')
        if (planId) {
            setIsDropTarget(true)
        }
    }

    const handleDragLeave = () => {
        setIsDropTarget(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDropTarget(false)

        const planId = e.dataTransfer.getData('application/plan-id')
        if (planId) {
            await onDropPlan(parseInt(planId), dateISO)
            router.refresh()
        }
    }

    return (
        <div
            className={`bg-white border-2 rounded mb-4 overflow-visible contain-content transition-all ${isDropTarget
                    ? 'border-green-500 ring-4 ring-green-300 scale-[1.01]'
                    : isHoliday
                        ? 'border-red-500'
                        : 'border-slate-300'
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={`${isHoliday ? 'bg-red-600' : 'bg-blue-600'} text-white px-4 py-3 flex justify-between items-center ${isDropTarget ? 'bg-green-600' : ''}`}>
                <h3 className="font-black text-xl">
                    📅 {dateKey}
                    {isHoliday && <span className="ml-2 px-2 py-1 bg-red-800 rounded text-sm">⚠️ 休日</span>}
                    {isDropTarget && <span className="ml-2 px-2 py-1 bg-green-800 rounded text-sm">📥 ここにドロップ</span>}
                </h3>
                <div className="flex gap-6 text-base font-bold">
                    <span>{itemCount}件</span>
                    <span className={`${dailySeconds > maxSeconds ? 'text-red-300' : 'text-green-300'}`}>
                        {hours}時間{mins}分{secs}秒 / 7.5時間
                    </span>
                </div>
            </div>
            {children}
        </div>
    )
}
