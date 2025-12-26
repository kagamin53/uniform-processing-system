import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { PickingTable } from './PickingTable'
import { ExcelDropzone } from './ExcelDropzone'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{
        page?: string
        status?: string
        search?: string
        code?: string
        limit?: string
    }>
}

export default async function PickingPage({ searchParams }: Props) {
    const params = await searchParams
    const page = parseInt(params.page || '1')
    const status = params.status || 'all'
    const search = params.search || ''
    const code = params.code || ''
    const limit = parseInt(params.limit || '200')
    const pageSize = [50, 100, 200].includes(limit) ? limit : 200

    // 今日の日付（0時0分0秒）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const where: any = {
        processorCode: { in: ['9901', '9902'] },
        // 納期が今日以降のデータのみ表示
        shippingDate: { gte: today }
    }

    if (status !== 'all') {
        where.status = status
    }

    if (search) {
        where.OR = [
            { customerName: { contains: search } },
            { productName: { contains: search } },
            { remarks1: { contains: search } },
        ]
    }

    if (code) {
        where.processingCode = { code: { contains: code } }
    }

    const [items, total] = await Promise.all([
        prisma.pickingItem.findMany({
            where,
            orderBy: [
                { orderDate: 'desc' },
                { shippingDate: 'desc' }
            ],
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { processingCode: true }
        }),
        prisma.pickingItem.count({ where })
    ])

    const totalPages = Math.ceil(total / pageSize)

    const statusOptions = [
        { value: 'all', label: 'すべて' },
        { value: 'pending', label: '未処理' },
        { value: 'processing', label: '加工中' },
        { value: 'completed', label: '完了' },
        { value: 'shipped', label: '出荷済' },
    ]

    return (
        <div className="max-w-full mx-auto px-4">
            {/* ヘッダー - 計画表と同じ青色 */}
            <div className="bg-white border-2 border-slate-300 rounded mb-4 overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
                    <h2 className="font-black text-xl">📋 ピッキング一覧</h2>
                    <span className="text-base font-bold">{total.toLocaleString()} 件</span>
                </div>

                {/* Excelインポート */}
                <div className="p-4 border-b border-slate-200 bg-white">
                    <ExcelDropzone />
                </div>

                {/* 検索フィルター */}
                <form className="p-4 flex flex-wrap gap-4 items-end border-b border-slate-200 bg-slate-50">
                    <div>
                        <label className="block text-xs text-slate-600 font-bold mb-1">表示件数</label>
                        <select
                            name="limit"
                            defaultValue={pageSize}
                            className="p-2 rounded border border-slate-300 text-sm bg-white"
                        >
                            <option value="50">50件</option>
                            <option value="100">100件</option>
                            <option value="200">200件</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-600 font-bold mb-1">ステータス</label>
                        <select
                            name="status"
                            defaultValue={status}
                            className="p-2 rounded border border-slate-300 text-sm bg-white"
                        >
                            {statusOptions.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-600 font-bold mb-1">加工CD</label>
                        <input
                            type="text"
                            name="code"
                            defaultValue={code}
                            placeholder="HA0001"
                            className="p-2 rounded border border-slate-300 text-sm w-32"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-slate-600 font-bold mb-1">検索</label>
                        <input
                            type="text"
                            name="search"
                            defaultValue={search}
                            placeholder="得意先名、商品名、備考..."
                            className="p-2 rounded border border-slate-300 text-sm w-full"
                        />
                    </div>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-bold">
                        検索
                    </button>
                    {(search || code || status !== 'all') && (
                        <Link href="/picking" className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition text-sm font-bold">
                            クリア
                        </Link>
                    )}
                </form>

                {/* テーブル */}
                <PickingTable items={items} />
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 bg-white border-2 border-slate-300 rounded p-4">
                    {page > 1 ? (
                        <Link
                            href={`/picking?page=${page - 1}&status=${status}&search=${search}&code=${code}&limit=${limit}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
                        >
                            ← 前へ
                        </Link>
                    ) : (
                        <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded">← 前へ</span>
                    )}
                    <span className="px-4 py-2 text-slate-800 font-bold">
                        {page} / {totalPages} ページ
                    </span>
                    {page < totalPages ? (
                        <Link
                            href={`/picking?page=${page + 1}&status=${status}&search=${search}&code=${code}&limit=${limit}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
                        >
                            次へ →
                        </Link>
                    ) : (
                        <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded">次へ →</span>
                    )}
                </div>
            )}
        </div>
    )
}
