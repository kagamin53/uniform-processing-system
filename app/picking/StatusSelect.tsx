'use client'

import { updateSinglePickingStatus } from './actions'
import { useTransition } from 'react'

interface Props {
    itemId: number
    currentStatus: string
}

export function StatusSelect({ itemId, currentStatus }: Props) {
    const [isPending, startTransition] = useTransition()

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        startTransition(async () => {
            await updateSinglePickingStatus(itemId, e.target.value)
        })
    }

    return (
        <select
            value={currentStatus}
            onChange={handleChange}
            disabled={isPending}
            className={`px-2 py-1 rounded text-xs bg-gray-800 border border-gray-600 ${isPending ? 'opacity-50' : ''
                } ${currentStatus === 'pending' ? 'text-yellow-300' :
                    currentStatus === 'processing' ? 'text-orange-300' :
                        currentStatus === 'completed' ? 'text-green-300' :
                            'text-gray-300'
                }`}
        >
            <option value="pending">未処理</option>
            <option value="processing">加工中</option>
            <option value="completed">完了</option>
            <option value="shipped">出荷済</option>
        </select>
    )
}
