'use client'

import { useTransition, memo } from 'react'

interface MachineSelectProps {
    itemId: number
    currentMachine: string
    baldanTime: string | null
    tajimaTime: string | null
    updateAction: (id: number, machine: string) => Promise<{ success?: boolean; error?: string }>
}

export const MachineSelect = memo(function MachineSelect({ itemId, currentMachine, baldanTime, tajimaTime, updateAction }: MachineSelectProps) {
    const [isPending, startTransition] = useTransition()

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const machine = e.target.value
        startTransition(async () => {
            await updateAction(itemId, machine)
        })
    }

    // バルダン時間がない場合はタジマ固定
    const hasBaldanTime = baldanTime && baldanTime !== '-' && baldanTime !== ''

    return (
        <select
            value={currentMachine}
            onChange={handleChange}
            disabled={isPending || !hasBaldanTime}
            className={`p-1 text-xs rounded border ${currentMachine === 'baldan'
                ? 'bg-blue-900/50 border-blue-500 text-blue-300'
                : 'bg-green-900/50 border-green-500 text-green-300'
                } ${isPending ? 'opacity-50' : ''} ${!hasBaldanTime ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!hasBaldanTime ? 'バルダン時間が設定されていません' : ''}
        >
            <option value="tajima">タジマ</option>
            <option value="baldan" disabled={!hasBaldanTime}>バルダン</option>
        </select>
    )
})
