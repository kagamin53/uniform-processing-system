'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlanningTableRow } from './PlanningTableRow'

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

interface PlanningTableClientProps {
    items: PlanningEntry[]
    dateKey: string
    onReorder: (dateKey: string, orderedIds: number[]) => Promise<{ success?: boolean }>
    onUpdateStartTime: (id: number, startTime: string) => Promise<{ success?: boolean }>
    onUpdateMachine: (id: number, machine: string) => Promise<{ success?: boolean; error?: string }>
    onUpdatePrepTime: (id: number, prepMinutes: number) => Promise<{ success?: boolean }>
    onUpdateStatus: (id: number, status: string) => Promise<void>
    onUpdateProcessingTime: (id: number, baldanTime: string, tajimaTime: string, syncToMaster: boolean) => Promise<{ success?: boolean }>
    onUpdateDate: (id: number, dateStr: string) => Promise<{ success?: boolean }>
}



export function PlanningTableClient({
    items: initialItems,
    dateKey,
    onReorder,
    onUpdateStartTime,
    onUpdateMachine,
    onUpdatePrepTime,
    onUpdateStatus,
    onUpdateProcessingTime,
    onUpdateDate
}: PlanningTableClientProps) {
    // console.log('Rendering PlanningTableClient', { itemsCount: initialItems.length })
    const router = useRouter()

    // State for rendering
    const [items, setItems] = useState(initialItems)
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [overIndex, setOverIndex] = useState<number | null>(null)
    const [isPending, startTransition] = useTransition()

    // Refs for stable callbacks
    const itemsRef = useRef(initialItems)
    const dragIndexRef = useRef<number | null>(null)
    const overIndexRef = useRef<number | null>(null)

    // Sync refs/state with props
    useEffect(() => {
        setItems(initialItems)
        itemsRef.current = initialItems
    }, [initialItems])

    // Update refs when state changes
    useEffect(() => {
        dragIndexRef.current = dragIndex
        overIndexRef.current = overIndex
    }, [dragIndex, overIndex])

    // Stable handlers using refs
    const handleDragStart = useCallback((index: number) => {
        setDragIndex(index)
        // Ref update will happen via effect
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault()
        const currentDragIndex = dragIndexRef.current
        const currentOverIndex = overIndexRef.current

        if (currentDragIndex !== null && currentDragIndex !== index) {
            if (currentOverIndex !== index) {
                setOverIndex(index)
            }
        }
    }, [])

    const handleDragEnd = useCallback(() => {
        const currentDragIndex = dragIndexRef.current
        const currentOverIndex = overIndexRef.current
        const currentItems = itemsRef.current

        if (currentDragIndex !== null && currentOverIndex !== null && currentDragIndex !== currentOverIndex) {
            const newItems = [...currentItems]
            const [removed] = newItems.splice(currentDragIndex, 1)
            newItems.splice(currentOverIndex, 0, removed)

            // Optimistic update
            setItems(newItems)
            itemsRef.current = newItems

            const orderedIds = newItems.map(item => item.id)
            startTransition(async () => {
                await onReorder(dateKey, orderedIds)
                router.refresh()
            })
        }
        setDragIndex(null)
        setOverIndex(null)
    }, [dateKey, onReorder, router])

    return (
        <tbody className="bg-white">
            {items.map((plan, index) => (
                <PlanningTableRow
                    key={plan.id}
                    plan={plan}
                    index={index}
                    isDragging={dragIndex === index}
                    isOver={overIndex === index}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onUpdateStartTime={onUpdateStartTime}
                    onUpdateMachine={onUpdateMachine}
                    onUpdatePrepTime={onUpdatePrepTime}
                    onUpdateStatus={onUpdateStatus}
                    onUpdateProcessingTime={onUpdateProcessingTime}
                    onUpdateDate={onUpdateDate}
                />
            ))}
        </tbody>
    )
}
