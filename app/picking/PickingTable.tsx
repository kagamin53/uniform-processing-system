'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusSelect } from './StatusSelect'
import { AddToPlanForm } from './AddToPlanForm'

interface PickingItem {
    id: number
    orderNumber: string | null
    orderDate: Date | null
    shippingDate: Date | null
    customerCode: string | null
    customerName: string | null
    productName: string | null
    colorName: string | null
    size: string | null
    orderQuantity: number | null
    remarks1: string | null
    processingType: string | null
    status: string
    addedToPlan: boolean
    processingCode: {
        code: string
    } | null
}

interface Props {
    items: PickingItem[]
}

// スタイル定数（計画表と統一）
const thStyle = "px-3 py-2 text-left font-bold border border-slate-300 bg-blue-200 text-slate-800"
const thCenterStyle = "px-3 py-2 text-center font-bold border border-slate-300 bg-blue-200 text-slate-800"
const tdStyle = "px-3 py-2 border border-slate-300 text-sm text-slate-900"
const tdCenterStyle = "px-3 py-2 border border-slate-300 text-sm text-center text-slate-900"

export function PickingTable({ items }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // 選択可能なアイテム（まだ計画に追加されていないもの）
    const selectableItems = items.filter(i => !i.addedToPlan)

    const toggleSelect = (id: number) => {
        const item = items.find(i => i.id === id)
        if (item?.addedToPlan) return // 既に追加済みは選択不可
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleAll = () => {
        if (selectedIds.length === selectableItems.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(selectableItems.map(i => i.id))
        }
    }

    const clearSelection = () => setSelectedIds([])

    // 加工CD抽出ヘルパー
    const extractCode = (remarks1: string | null) => {
        if (!remarks1) return null
        const cleaned = remarks1.replace(/\s+/g, '').toUpperCase()
        const embMatch = cleaned.match(/^([A-Z]{2}\d{4})/)
        const transMatch = cleaned.match(/^(P\d+)/)
        if (embMatch) return { code: embMatch[1], type: 'emb' }
        if (transMatch) return { code: transMatch[1], type: 'trans' }
        return null
    }

    // 備考抽出ヘルパー
    const extractRemark = (remarks1: string | null) => {
        if (!remarks1) return '-'
        const cleaned = remarks1.replace(/\s+/g, '')
        const embMatch = cleaned.match(/^[A-Z]{2}\d{4}(.*)/)
        const transMatch = cleaned.match(/^P\d+(.*)/)
        if (embMatch && embMatch[1]) return embMatch[1]
        if (transMatch && transMatch[1]) return transMatch[1]
        return remarks1
    }

    return (
        <div>
            {/* 選択アクション */}
            {selectedIds.length > 0 && (
                <div className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-3 flex justify-between items-center">
                    <AddToPlanForm selectedIds={selectedIds} onClear={clearSelection} />
                    <button onClick={clearSelection} className="text-slate-600 hover:text-slate-800 text-sm font-bold">
                        選択解除
                    </button>
                </div>
            )}

            {/* テーブル */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr>
                            <th className={thCenterStyle}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === selectableItems.length && selectableItems.length > 0}
                                    onChange={toggleAll}
                                    className="rounded"
                                    disabled={selectableItems.length === 0}
                                />
                            </th>
                            <th className={thStyle}>受注No</th>
                            <th className={thStyle}>受注日</th>
                            <th className={thStyle}>出荷予定</th>
                            <th className={thStyle}>得意先CD</th>
                            <th className={`${thStyle} min-w-[150px]`}>得意先</th>
                            <th className={`${thStyle} min-w-[200px]`}>商品名</th>
                            <th className={thStyle}>色</th>
                            <th className={thStyle}>サイズ</th>
                            <th className={`${thCenterStyle} bg-yellow-200`}>数量</th>
                            <th className={thStyle}>加工CD</th>
                            <th className={thStyle}>備考</th>
                            <th className={thStyle}>加工内容</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const codeInfo = extractCode(item.remarks1)
                            return (
                                <tr
                                    key={item.id}
                                    className={`
                                        ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                        ${selectedIds.includes(item.id) ? 'bg-blue-100' : ''} 
                                        ${item.addedToPlan ? 'opacity-60' : ''}
                                        hover:bg-blue-50
                                    `}
                                >
                                    <td className={tdCenterStyle}>
                                        {item.addedToPlan ? (
                                            <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">済</span>
                                        ) : (
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                                className="rounded"
                                            />
                                        )}
                                    </td>
                                    <td className={tdStyle}>{item.orderNumber || '-'}</td>
                                    <td className={tdStyle}>
                                        {item.orderDate ? new Date(item.orderDate).toLocaleDateString('ja-JP') : '-'}
                                    </td>
                                    <td className={tdStyle}>
                                        {item.shippingDate ? new Date(item.shippingDate).toLocaleDateString('ja-JP') : '-'}
                                    </td>
                                    <td className={tdStyle}>{item.customerCode || '-'}</td>
                                    <td className={`${tdStyle} font-medium`}>{item.customerName || '-'}</td>
                                    <td className={tdStyle}>{item.productName || '-'}</td>
                                    <td className={tdStyle}>{item.colorName || '-'}</td>
                                    <td className={tdStyle}>{item.size || '-'}</td>
                                    <td className={`${tdCenterStyle} bg-yellow-50 font-bold`}>{item.orderQuantity || '-'}</td>
                                    <td className={tdStyle}>
                                        {item.processingCode ? (
                                            <Link href={`/codes/${item.processingCode.code}`} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200 border border-blue-300">
                                                {item.processingCode.code}
                                            </Link>
                                        ) : codeInfo ? (
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${codeInfo.type === 'emb' ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-cyan-100 text-cyan-700 border border-cyan-300'}`}>
                                                {codeInfo.code}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className={`${tdStyle} text-slate-500 text-xs max-w-[100px] truncate`}>
                                        {extractRemark(item.remarks1)}
                                    </td>
                                    <td className={tdStyle}>{item.processingType || '-'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
