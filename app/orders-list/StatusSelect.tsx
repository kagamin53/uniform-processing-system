'use client'

import { useTransition, memo } from 'react'

interface Props {
    itemId: number
    currentStatus: string
    updateAction: (id: number, status: string) => Promise<void>
}

export const OrderStatusSelect = memo(function OrderStatusSelect({ itemId, currentStatus, updateAction }: Props) {
    const [isPending, startTransition] = useTransition()

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        startTransition(async () => {
            await updateAction(itemId, e.target.value)
        })
    }

    return (
        <select
            value={currentStatus}
            onChange={handleChange}
            disabled={isPending}
            className={`px-2 py-1 rounded text-xs bg-gray-800 border border-gray-600 ${isPending ? 'opacity-50' : ''
                } ${currentStatus === 'pending' ? 'text-yellow-300' :
                    currentStatus === 'in_progress' ? 'text-orange-300' :
                        'text-green-300'
                }`}
        >
            <option value="pending">未着手</option>
            <option value="in_progress">加工中</option>
            <option value="completed">完了</option>
        </select>
    )
})
