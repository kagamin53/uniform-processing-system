'use client'

import { addToPlan } from './actions'
import { useTransition, useState } from 'react'

interface Props {
    selectedIds: number[]
    onClear: () => void
}

export function AddToPlanForm({ selectedIds, onClear }: Props) {
    const [isPending, startTransition] = useTransition()
    const [planDate, setPlanDate] = useState('')

    const handleSubmit = () => {
        if (selectedIds.length === 0) {
            alert('項目を選択してください')
            return
        }

        const formData = new FormData()
        selectedIds.forEach(id => formData.append('pickingIds', id.toString()))
        formData.append('planDate', planDate)

        startTransition(async () => {
            const result = await addToPlan(formData)
            if (result?.success) {
                alert(`${result.count}件を計画表に追加しました`)
                onClear()
            } else if (result?.error) {
                alert(result.error)
            }
        })
    }

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-blue-400">{selectedIds.length}件選択中</span>
            <input
                type="date"
                value={planDate}
                onChange={e => setPlanDate(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 text-sm"
                placeholder="加工予定日"
            />
            <button
                onClick={handleSubmit}
                disabled={isPending || selectedIds.length === 0}
                className={`px-4 py-2 rounded text-sm transition ${isPending || selectedIds.length === 0
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
            >
                {isPending ? '追加中...' : '📅 計画表に追加'}
            </button>
        </div>
    )
}
