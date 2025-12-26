'use client'

import { useState, useTransition } from 'react'

interface DraggableRowProps {
    planId: number
    index: number
    children: React.ReactNode
    onDragStart: (index: number) => void
    onDragOver: (index: number) => void
    onDragEnd: () => void
    isDragging: boolean
    isOver: boolean
}

export function DraggableRow({
    planId,
    index,
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
    isDragging,
    isOver
}: DraggableRowProps) {
    return (
        <tr
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => {
                e.preventDefault()
                onDragOver(index)
            }}
            onDragEnd={onDragEnd}
            className={`border-t border-gray-700/50 cursor-move transition-all
                ${isDragging ? 'opacity-50 bg-blue-900/30' : 'hover:bg-gray-800/30'}
                ${isOver ? 'border-t-2 border-t-green-500' : ''}
            `}
            data-plan-id={planId}
        >
            {children}
        </tr>
    )
}

interface DraggableTableProps {
    items: { id: number;[key: string]: unknown }[]
    dateKey: string
    onReorder: (dateKey: string, orderedIds: number[]) => Promise<void>
    renderRow: (item: { id: number;[key: string]: unknown }, index: number, props: {
        onDragStart: (index: number) => void
        onDragOver: (index: number) => void
        onDragEnd: () => void
        isDragging: boolean
        isOver: boolean
    }) => React.ReactNode
}

export function DraggableTable({ items, dateKey, onReorder, renderRow }: DraggableTableProps) {
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [overIndex, setOverIndex] = useState<number | null>(null)
    const [localItems, setLocalItems] = useState(items)
    const [isPending, startTransition] = useTransition()

    const handleDragStart = (index: number) => {
        setDragIndex(index)
    }

    const handleDragOver = (index: number) => {
        if (dragIndex === null || dragIndex === index) return
        setOverIndex(index)
    }

    const handleDragEnd = () => {
        if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
            // 配列を並び替え
            const newItems = [...localItems]
            const [removed] = newItems.splice(dragIndex, 1)
            newItems.splice(overIndex, 0, removed)
            setLocalItems(newItems)

            // サーバーに保存
            const orderedIds = newItems.map(item => item.id)
            startTransition(async () => {
                await onReorder(dateKey, orderedIds)
            })
        }

        setDragIndex(null)
        setOverIndex(null)
    }

    return (
        <>
            {localItems.map((item, index) => (
                renderRow(item, index, {
                    onDragStart: handleDragStart,
                    onDragOver: handleDragOver,
                    onDragEnd: handleDragEnd,
                    isDragging: dragIndex === index,
                    isOver: overIndex === index
                })
            ))}
        </>
    )
}
