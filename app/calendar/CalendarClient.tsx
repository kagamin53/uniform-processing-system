'use client'

import { useState, useTransition } from 'react'
import { toggleHoliday, updateHolidayName } from './actions'

interface Holiday {
    id: number
    date: Date
    name: string | null
}

interface CalendarClientProps {
    year: number
    month: number
    holidays: Holiday[]
}

export function CalendarClient({ year, month, holidays }: CalendarClientProps) {
    const [isPending, startTransition] = useTransition()
    const [editingDate, setEditingDate] = useState<string | null>(null)
    const [holidayName, setHolidayName] = useState('')

    // 月の日数と開始曜日を計算
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0=日曜

    // 休日の日付セットを作成（UTCのまま年月日を抽出）
    const holidayDates = new Set(
        holidays.map(h => {
            const d = new Date(h.date)
            // UTC日付から年月日を取得
            const y = d.getUTCFullYear()
            const m = String(d.getUTCMonth() + 1).padStart(2, '0')
            const day = String(d.getUTCDate()).padStart(2, '0')
            return `${y}-${m}-${day}`
        })
    )

    // 休日名のマップ
    const holidayNames: { [key: string]: string } = {}
    holidays.forEach(h => {
        const d = new Date(h.date)
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        const key = `${y}-${m}-${day}`
        holidayNames[key] = h.name || ''
    })

    // カレンダーのセルを生成
    const cells: (number | null)[] = []
    for (let i = 0; i < startDayOfWeek; i++) {
        cells.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(day)
    }

    const handleDayClick = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        startTransition(async () => {
            await toggleHoliday(dateStr)
        })
    }

    const handleNameSave = (dateStr: string) => {
        startTransition(async () => {
            await updateHolidayName(dateStr, holidayName)
            setEditingDate(null)
            setHolidayName('')
        })
    }

    const today = new Date()
    const isToday = (day: number) =>
        year === today.getFullYear() &&
        month === today.getMonth() + 1 &&
        day === today.getDate()

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 bg-slate-100 border-b-2 border-slate-300">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                    <div
                        key={day}
                        className={`py-3 text-center font-black text-lg ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-700'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7">
                {cells.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="h-24 bg-slate-50 border border-slate-200" />
                    }

                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const isHoliday = holidayDates.has(dateStr)
                    const dayOfWeek = (startDayOfWeek + day - 1) % 7
                    const isSunday = dayOfWeek === 0
                    const isSaturday = dayOfWeek === 6
                    const todayStyle = isToday(day)

                    return (
                        <div
                            key={day}
                            className={`h-24 border border-slate-200 p-2 cursor-pointer transition-all hover:bg-slate-100 ${isHoliday ? 'bg-red-100 hover:bg-red-200' : ''
                                } ${todayStyle ? 'ring-2 ring-blue-500 ring-inset' : ''} ${isPending ? 'opacity-50' : ''}`}
                            onClick={() => handleDayClick(day)}
                        >
                            <div className={`font-bold text-lg ${isHoliday ? 'text-red-600' :
                                isSunday ? 'text-red-500' :
                                    isSaturday ? 'text-blue-500' :
                                        'text-slate-700'
                                }`}>
                                {day}
                                {todayStyle && <span className="ml-1 text-xs text-blue-600">今日</span>}
                            </div>
                            {isHoliday && (
                                <div
                                    className="mt-1 text-xs text-red-600 font-bold truncate"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingDate(dateStr)
                                        setHolidayName(holidayNames[dateStr] || '')
                                    }}
                                >
                                    {holidayNames[dateStr] || '🔴 休日'}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* 休日名編集モーダル */}
            {editingDate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingDate(null)}>
                    <div className="bg-white rounded-lg p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-slate-800 mb-4">
                            📅 {editingDate} の休日名
                        </h3>
                        <input
                            type="text"
                            value={holidayName}
                            onChange={(e) => setHolidayName(e.target.value)}
                            placeholder="例: 年末年始、お盆休み"
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-lg font-bold focus:border-blue-500 focus:outline-none"
                            autoFocus
                        />
                        <div className="mt-4 flex gap-3 justify-end">
                            <button
                                onClick={() => setEditingDate(null)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded hover:bg-slate-300"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleNameSave(editingDate)}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                                disabled={isPending}
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 休日一覧 */}
            {holidays.length > 0 && (
                <div className="p-4 bg-slate-50 border-t-2 border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-2">📋 設定済み休日</h4>
                    <div className="flex flex-wrap gap-2">
                        {holidays.map(h => {
                            const d = new Date(h.date)
                            return (
                                <span
                                    key={h.id}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold"
                                >
                                    {d.getUTCMonth() + 1}/{d.getUTCDate()}
                                    {h.name && ` (${h.name})`}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
