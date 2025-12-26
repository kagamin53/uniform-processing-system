'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ImportResult {
    success: boolean
    imported: number
    skipped: number
    message: string
    error?: string
}

export function ExcelDropzone() {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const router = useRouter()

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/picking-import', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            setResult(data)

            if (data.success) {
                // Refresh the page to show new data
                router.refresh()
            }
        } catch (error) {
            setResult({
                success: false,
                imported: 0,
                skipped: 0,
                message: '',
                error: 'アップロード中にエラーが発生しました'
            })
        } finally {
            setIsUploading(false)
        }
    }, [router])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            uploadFile(file)
        } else {
            setResult({
                success: false,
                imported: 0,
                skipped: 0,
                message: '',
                error: 'Excelファイル(.xlsx, .xls)を選択してください'
            })
        }
    }, [uploadFile])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadFile(file)
        }
        e.target.value = '' // Reset input
    }, [uploadFile])

    return (
        <div className="mb-4">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
                    ${isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                    }
                    ${isUploading ? 'opacity-50 cursor-wait' : ''}
                `}
                onClick={() => document.getElementById('excel-file-input')?.click()}
            >
                <input
                    id="excel-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                />

                {isUploading ? (
                    <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-slate-600 font-bold">インポート中...</span>
                    </div>
                ) : (
                    <div>
                        <div className="text-3xl mb-2">📥</div>
                        <div className="text-slate-700 font-bold">
                            Excelファイルをここにドロップ
                        </div>
                        <div className="text-slate-500 text-sm mt-1">
                            または クリックして選択
                        </div>
                    </div>
                )}
            </div>

            {/* Result Display */}
            {result && (
                <div className={`mt-3 p-3 rounded-lg font-bold ${result.success
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                    {result.success ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xl">✅</span>
                            <span>{result.message}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xl">❌</span>
                            <span>{result.error || 'エラーが発生しました'}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
