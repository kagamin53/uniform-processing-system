'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCodeTime } from './actions'

interface ProcessingCode {
    id: number
    code: string
    type: string
    customerCode: string | null
    city: string | null
    customerName: string | null
    position: string | null
    productCode: string | null
    productName: string | null
    modelNumber: string | null
    colorCode: string | null
    colorName: string | null
    processTime: string | null
    costPrice: number | null
    sellingPrice: number | null
    threadColor: string | null
    baldanTime: string | null
    tajimaTime: string | null
    notes: string | null
}

interface Props {
    codes: ProcessingCode[]
}

export function CodeListClient({ codes }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [editingCode, setEditingCode] = useState<string | null>(null)
    const [baldanValue, setBaldanValue] = useState('')
    const [tajimaValue, setTajimaValue] = useState('')

    const handleTimeClick = (code: string, baldan: string | null, tajima: string | null) => {
        setEditingCode(code)
        setBaldanValue(baldan || '')
        setTajimaValue(tajima || '')
    }

    const handleSave = (code: string) => {
        startTransition(async () => {
            await updateCodeTime(code, baldanValue || null, tajimaValue || null)
            setEditingCode(null)
            router.refresh()
        })
    }

    return (
        <tbody>
            {codes.map((code, index) => (
                <tr key={code.id} className={`border-t border-slate-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${isPending ? 'opacity-70' : ''}`}>
                    <td className="p-3">
                        <Link href={`/codes/${code.code}`} className="text-blue-600 hover:underline font-mono font-bold">
                            {code.code}
                        </Link>
                    </td>
                    <td className="p-3 text-slate-700">{code.customerCode || '-'}</td>
                    <td className="p-3 text-slate-700">{code.city || '-'}</td>
                    <td className="p-3 text-slate-800 font-medium">{code.customerName || '-'}</td>
                    <td className="p-3 text-slate-700">{code.position || '-'}</td>
                    <td className="p-3 text-slate-700">{code.productCode || '-'}</td>
                    <td className="p-3 text-slate-700">{code.productName || '-'}</td>
                    <td className="p-3 text-slate-700">{code.modelNumber || '-'}</td>
                    <td className="p-3 text-slate-700">{code.colorCode || '-'}</td>
                    <td className="p-3 text-slate-700">{code.colorName || '-'}</td>
                    <td className="p-3 text-slate-700">{code.processTime || '-'}</td>
                    <td className="p-3 text-right text-slate-700">{code.costPrice ? `¥${code.costPrice.toLocaleString()}` : '-'}</td>
                    <td className="p-3 text-right text-slate-700">{code.sellingPrice ? `¥${code.sellingPrice.toLocaleString()}` : '-'}</td>
                    <td className="p-3 text-slate-700">{code.threadColor || '-'}</td>
                    <td className="p-3 bg-blue-50">
                        {editingCode === code.code ? (
                            <input
                                type="text"
                                value={baldanValue}
                                onChange={(e) => setBaldanValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave(code.code)
                                    if (e.key === 'Escape') setEditingCode(null)
                                }}
                                className="w-16 p-1 text-sm border-2 border-blue-500 rounded font-bold text-center"
                                placeholder="3'00"
                                autoFocus
                            />
                        ) : (
                            <button
                                onClick={() => handleTimeClick(code.code, code.baldanTime, code.tajimaTime)}
                                className="text-blue-700 font-bold hover:bg-blue-200 px-2 py-1 rounded w-full text-left"
                            >
                                {code.baldanTime || '-'}
                            </button>
                        )}
                    </td>
                    <td className="p-3 bg-green-50">
                        {editingCode === code.code ? (
                            <div className="flex gap-1 items-center">
                                <input
                                    type="text"
                                    value={tajimaValue}
                                    onChange={(e) => setTajimaValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(code.code)
                                        if (e.key === 'Escape') setEditingCode(null)
                                    }}
                                    className="w-16 p-1 text-sm border-2 border-green-500 rounded font-bold text-center"
                                    placeholder="3'00"
                                />
                                <button
                                    onClick={() => handleSave(code.code)}
                                    className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 whitespace-nowrap"
                                >
                                    保存
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleTimeClick(code.code, code.baldanTime, code.tajimaTime)}
                                className="text-green-700 font-bold hover:bg-green-200 px-2 py-1 rounded w-full text-left"
                            >
                                {code.tajimaTime || '-'}
                            </button>
                        )}
                    </td>
                    <td className="p-3 text-slate-600">{code.notes || '-'}</td>
                </tr>
            ))}
        </tbody>
    )
}
