'use client'

import { useState, useTransition } from 'react'

interface StartTimeEditProps {
    itemId: number
    currentStartTime: string | null
    updateAction: (id: number, startTime: string) => Promise<{ success?: boolean }>
}

export function StartTimeEdit({ itemId, currentStartTime, updateAction }: StartTimeEditProps) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState(currentStartTime || '08:00')

    const handleSave = () => {
        startTransition(async () => {
            await updateAction(itemId, value)
            setIsEditing(false)
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setIsEditing(false)
            setValue(currentStartTime || '08:00')
        }
    }

    if (isEditing) {
        return (
            <input
                type="time"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="p-1 text-xs bg-gray-800 border border-green-500 rounded text-green-300 w-20"
                autoFocus
                disabled={isPending}
            />
        )
    }

    return (
        <button
            onClick={() => setIsEditing(true)}
            className="p-1 font-mono text-green-300 hover:bg-green-900/40 rounded cursor-pointer"
            disabled={isPending}
        >
            {currentStartTime || '-'}
        </button>
    )
}
