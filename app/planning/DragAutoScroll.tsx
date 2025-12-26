'use client'

import { useEffect, useRef } from 'react'

// ドラッグ中に画面の上下端に近づくと自動スクロールする
export function DragAutoScroll() {
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const SCROLL_ZONE = 100 // 画面端から100px以内でスクロール開始
        const SCROLL_SPEED = 15 // スクロール速度

        const handleDragOver = (e: DragEvent) => {
            const y = e.clientY
            const windowHeight = window.innerHeight

            // 既存のスクロールを停止
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current)
                scrollIntervalRef.current = null
            }

            // 上端付近
            if (y < SCROLL_ZONE) {
                const speed = Math.max(5, SCROLL_SPEED * (1 - y / SCROLL_ZONE))
                scrollIntervalRef.current = setInterval(() => {
                    window.scrollBy(0, -speed)
                }, 16)
            }
            // 下端付近
            else if (y > windowHeight - SCROLL_ZONE) {
                const speed = Math.max(5, SCROLL_SPEED * (1 - (windowHeight - y) / SCROLL_ZONE))
                scrollIntervalRef.current = setInterval(() => {
                    window.scrollBy(0, speed)
                }, 16)
            }
        }

        const handleDragEnd = () => {
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current)
                scrollIntervalRef.current = null
            }
        }

        document.addEventListener('dragover', handleDragOver)
        document.addEventListener('dragend', handleDragEnd)
        document.addEventListener('drop', handleDragEnd)

        return () => {
            document.removeEventListener('dragover', handleDragOver)
            document.removeEventListener('dragend', handleDragEnd)
            document.removeEventListener('drop', handleDragEnd)
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current)
            }
        }
    }, [])

    return null
}
