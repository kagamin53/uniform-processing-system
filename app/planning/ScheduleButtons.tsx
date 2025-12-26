'use client'

import { useState, useTransition } from 'react'
import { autoSchedulePlanning, resetSchedule } from './schedule-actions'

interface ScheduleOptions {
    startHour: number
    endHour: number
    breakStart: number
    breakEnd: number
    sortBy: 'deadline' | 'quantity' | 'processingTime'
    startDate: string
}

export function ScheduleButtons() {
    const [isPending, startTransition] = useTransition()
    const [showSettings, setShowSettings] = useState(false)

    // デフォルト設定
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const [options, setOptions] = useState<ScheduleOptions>({
        startHour: 8,
        endHour: 17,
        breakStart: 12,
        breakEnd: 13,
        sortBy: 'deadline',
        startDate: tomorrowStr
    })

    const handleAutoSchedule = () => {
        startTransition(async () => {
            const result = await autoSchedulePlanning(options)
            alert(result.message)
            setShowSettings(false)
        })
    }

    const handleReset = () => {
        if (!confirm('すべてのスケジュールをリセットしますか？')) return
        startTransition(async () => {
            const result = await resetSchedule()
            alert(result.message)
        })
    }

    return (
        <div className="relative">
            <div className="flex gap-2">
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="px-4 py-2 rounded text-sm transition bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                    ⚙️ スケジュール設定
                </button>
                <button
                    onClick={handleReset}
                    disabled={isPending}
                    className={`px-4 py-2 rounded text-sm transition ${isPending
                        ? 'bg-gray-400 text-gray-200 cursor-wait'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                >
                    リセット
                </button>
            </div>

            {/* 設定パネル */}
            {showSettings && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white border-2 border-slate-300 rounded shadow-xl z-50 p-4">
                    <h3 className="font-black text-lg text-slate-800 mb-4 border-b pb-2">自動スケジュール設定</h3>

                    {/* 開始日 */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-600 mb-1">開始日</label>
                        <input
                            type="date"
                            value={options.startDate}
                            onChange={(e) => setOptions({ ...options, startDate: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded"
                        />
                    </div>

                    {/* 作業時間 */}
                    <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">作業開始</label>
                            <select
                                value={options.startHour}
                                onChange={(e) => setOptions({ ...options, startHour: parseInt(e.target.value) })}
                                className="w-full p-2 border border-slate-300 rounded"
                            >
                                {[6, 7, 8, 9, 10].map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">作業終了</label>
                            <select
                                value={options.endHour}
                                onChange={(e) => setOptions({ ...options, endHour: parseInt(e.target.value) })}
                                className="w-full p-2 border border-slate-300 rounded"
                            >
                                {[15, 16, 17, 18, 19, 20].map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 昼休憩 */}
                    <div className="mb-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">昼休憩開始</label>
                            <select
                                value={options.breakStart}
                                onChange={(e) => setOptions({ ...options, breakStart: parseInt(e.target.value) })}
                                className="w-full p-2 border border-slate-300 rounded"
                            >
                                {[11, 12, 13].map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">昼休憩終了</label>
                            <select
                                value={options.breakEnd}
                                onChange={(e) => setOptions({ ...options, breakEnd: parseInt(e.target.value) })}
                                className="w-full p-2 border border-slate-300 rounded"
                            >
                                {[12, 13, 14].map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ソート順 */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-600 mb-1">優先順位</label>
                        <select
                            value={options.sortBy}
                            onChange={(e) => setOptions({ ...options, sortBy: e.target.value as ScheduleOptions['sortBy'] })}
                            className="w-full p-2 border border-slate-300 rounded"
                        >
                            <option value="deadline">納期が早い順</option>
                            <option value="quantity">数量が多い順</option>
                            <option value="processingTime">加工時間が短い順</option>
                        </select>
                    </div>

                    {/* ボタン */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAutoSchedule}
                            disabled={isPending}
                            className={`flex-1 px-4 py-3 rounded text-sm font-bold transition ${isPending
                                ? 'bg-gray-400 text-gray-200 cursor-wait'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                        >
                            {isPending ? '処理中...' : '🗓️ スケジュール実行'}
                        </button>
                        <button
                            onClick={() => setShowSettings(false)}
                            className="px-4 py-3 rounded text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-700"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
