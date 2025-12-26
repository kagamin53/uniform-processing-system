import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { CodeListClient } from './CodeListClient'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{
        page?: string
        search?: string
    }>
}

export default async function CodesPage({ searchParams }: Props) {
    const params = await searchParams
    const page = parseInt(params.page || '1')
    const search = params.search || ''
    const pageSize = 50

    const where: any = {}

    if (search) {
        where.OR = [
            { code: { contains: search } },
            { customerName: { contains: search } },
            { position: { contains: search } },
            { threadColor: { contains: search } },
        ]
    }

    const [codes, total] = await Promise.all([
        prisma.processingCode.findMany({
            where,
            orderBy: { code: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.processingCode.count({ where })
    ])

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="max-w-full mx-auto px-4">
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-4 bg-white border border-slate-300 rounded p-4">
                <h2 className="text-xl font-black text-slate-800">加工コードマスター</h2>
                <span className="text-slate-600 font-bold">{total.toLocaleString()} 件</span>
            </div>

            {/* 検索フォーム */}
            <form className="bg-white border border-slate-300 rounded p-4 mb-4 flex gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        name="search"
                        defaultValue={search}
                        placeholder="コード、得意先名、位置、糸色で検索..."
                        className="p-2 rounded border border-slate-300 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-bold">
                    検索
                </button>
                {search && (
                    <Link href="/codes" className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition text-sm font-bold">
                        クリア
                    </Link>
                )}
            </form>

            {/* テーブル */}
            <div className="bg-white border border-slate-300 rounded overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead className="bg-slate-700 text-white">
                            <tr>
                                <th className="text-left p-3 font-bold">刺繍CD</th>
                                <th className="text-left p-3 font-bold">得意先CD</th>
                                <th className="text-left p-3 font-bold">市・郡</th>
                                <th className="text-left p-3 font-bold">得意先名</th>
                                <th className="text-left p-3 font-bold">刺繍位置</th>
                                <th className="text-left p-3 font-bold">商品CD</th>
                                <th className="text-left p-3 font-bold">商品名</th>
                                <th className="text-left p-3 font-bold">型式</th>
                                <th className="text-left p-3 font-bold">色CD</th>
                                <th className="text-left p-3 font-bold">色名</th>
                                <th className="text-left p-3 font-bold">刺繍工程時期</th>
                                <th className="text-right p-3 font-bold">実費</th>
                                <th className="text-right p-3 font-bold">売値</th>
                                <th className="text-left p-3 font-bold">使用糸</th>
                                <th className="text-left p-3 font-bold bg-blue-600">バルダン</th>
                                <th className="text-left p-3 font-bold bg-green-600">タジマ</th>
                                <th className="text-left p-3 font-bold">備考</th>
                            </tr>
                        </thead>
                        <CodeListClient codes={codes} />
                    </table>
                </div>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4 bg-white border border-slate-300 rounded p-4">
                    {page > 1 ? (
                        <Link
                            href={`/codes?page=${page - 1}&search=${search}`}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-bold"
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
                            href={`/codes?page=${page + 1}&search=${search}`}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-bold"
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
