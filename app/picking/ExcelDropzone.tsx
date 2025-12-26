'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface ImportResult {
    success: boolean
    imported: number
    skipped: number
    message: string
    error?: string
}

// Parse Japanese date
function parseJapaneseDate(dateStr: any): string | null {
    if (!dateStr) return null
    if (dateStr instanceof Date) return dateStr.toISOString()

    // Handle "2023年 1月18日" format
    const match = String(dateStr).match(/(\d+)年\s*(\d+)月\s*(\d+)日/)
    if (match) {
        const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
        return d.toISOString()
    }

    // Try standard date parsing
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d.toISOString()
}

export function ExcelDropzone() {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [progress, setProgress] = useState('')
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
        setProgress('ファイルを読み込み中...')

        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer()
            setProgress('Excelを解析中...')

            const workbook = XLSX.read(arrayBuffer, { type: 'array' })
            const sheetName = workbook.SheetNames.includes('Sheet1') ? 'Sheet1' : workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

            // Row 3 is headers (0-indexed: row[2]), data starts from row 4
            const rows = data.slice(3)
            setProgress(`${rows.length}行のデータを処理中...`)

            // Parse rows to JSON
            const items: any[] = []
            for (const row of rows) {
                if (!row[0]) continue

                items.push({
                    orderDate: parseJapaneseDate(row[0]),
                    orderNumber: row[1] ? String(row[1]) : null,
                    orderLine: typeof row[2] === 'number' ? row[2] : null,
                    pickingNumber: typeof row[3] === 'number' ? row[3] : null,
                    customerCode: row[4] ? String(row[4]) : null,
                    customerName: row[5] ? String(row[5]) : null,
                    deliveryCode: row[6] ? String(row[6]) : null,
                    deliveryName: row[7] ? String(row[7]) : null,
                    shippingDate: parseJapaneseDate(row[8]),
                    supplierCode: row[9] ? String(row[9]) : null,
                    supplierName: row[10] ? String(row[10]) : null,
                    productCode: row[11] ? String(row[11]) : null,
                    productName: row[12] ? String(row[12]) : null,
                    colorCode: row[13] ? String(row[13]) : null,
                    colorName: row[14] ? String(row[14]) : null,
                    size: row[15] ? String(row[15]) : null,
                    orderQuantity: typeof row[16] === 'number' ? row[16] : null,
                    normalShipment: row[17] ? String(row[17]) : null,
                    processingTypeCode: row[18] ? String(row[18]) : null,
                    processingType: row[19] ? String(row[19]) : null,
                    materialCode: row[20] ? String(row[20]) : null,
                    materialName: row[21] ? String(row[21]) : null,
                    positionCode: row[22] ? String(row[22]) : null,
                    positionName: row[23] ? String(row[23]) : null,
                    processorCode: row[24] ? String(row[24]) : null,
                    processorName: row[25] ? String(row[25]) : null,
                    remarks1: row[26] ? String(row[26]) : null,
                    materialUsage: typeof row[27] === 'number' ? row[27] : null,
                })
            }

            setProgress(`${items.length}件をサーバーに送信中...`)

            // Send JSON to API (in batches to avoid payload size issues)
            const BATCH_SIZE = 500
            let totalImported = 0
            let totalSkipped = 0

            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE)
                setProgress(`送信中... ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`)

                const response = await fetch('/api/picking-import-json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: batch })
                })

                const data = await response.json()
                if (data.success) {
                    totalImported += data.imported
                    totalSkipped += data.skipped
                } else {
                    throw new Error(data.error || 'インポートエラー')
                }
            }

            setResult({
                success: true,
                imported: totalImported,
                skipped: totalSkipped,
                message: `${totalImported}件追加、${totalSkipped}件スキップ（重複）`
            })

            router.refresh()
        } catch (error) {
            setResult({
                success: false,
                imported: 0,
                skipped: 0,
                message: '',
                error: `エラー: ${error}`
            })
        } finally {
            setIsUploading(false)
            setProgress('')
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
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-slate-600 font-bold">{progress || 'インポート中...'}</span>
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
