import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { updateOrderStatus } from './actions'
import { OrderStatusSelect } from './StatusSelect'

export const dynamic = 'force-dynamic'

async function handleStatusUpdate(id: number, status: string) {
    'use server'
    await updateOrderStatus(id, status)
}

export default async function OrdersListPage() {
    const orders = await prisma.orderEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200
    })

    const pendingCount = orders.filter(o => o.status === 'pending').length
    const inProgressCount = orders.filter(o => o.status === 'in_progress').length
    const completedCount = orders.filter(o => o.status === 'completed').length
    const totalCount = orders.length

    return (
        <div className="w-full px-2">
            {/* ヘッダー - 計画表と同じスタイル */}
            <div className="bg-white border-2 border-slate-300 rounded mb-4 overflow-hidden">
                <div className="bg-purple-600 text-white px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/picking" className="px-4 py-2 bg-slate-200 text-slate-700 rounded border border-slate-400 hover:bg-slate-300 transition font-semibold flex items-center gap-2">
                            ← ピッキング一覧
                        </Link>
                        <h2 className="font-black text-xl">📋 受注一覧表（過去データ）</h2>
                    </div>
                    <div className="flex gap-3 text-base font-bold">
                        <span className="px-4 py-2 bg-yellow-200 text-yellow-900 border-2 border-yellow-400 rounded">未着手: {pendingCount}</span>
                        <span className="px-4 py-2 bg-orange-200 text-orange-900 border-2 border-orange-400 rounded">加工中: {inProgressCount}</span>
                        <span className="px-4 py-2 bg-green-200 text-green-900 border-2 border-green-400 rounded">完了: {completedCount}</span>
                        <span className="px-4 py-2 bg-slate-200 text-slate-700 border-2 border-slate-400 rounded">全 {totalCount} 件</span>
                    </div>
                </div>

                {/* テーブル */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">受付日</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">納期</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">加工CD</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">得意先名</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">位置</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">商品名</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">色名</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-center">枚数</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-center">実費</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-center">売値</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-left">使用糸</th>
                                <th className="px-3 py-2 border border-slate-300 font-bold text-center">状態</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-blue-50 transition">
                                    <td className="px-3 py-2 border border-slate-300">
                                        {order.receptionDate ? new Date(order.receptionDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-3 py-2 border border-slate-300">{order.completionDate || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300">
                                        <Link href={`/codes/${order.processingCode}`} className="text-purple-600 hover:underline font-bold">
                                            {order.processingCode || '-'}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2 border border-slate-300 max-w-[150px] truncate">{order.customerName || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300">{order.position || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300 max-w-[150px] truncate">{order.productName || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300">{order.colorName || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300 text-center font-bold">{order.totalQuantity || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300 text-center">{order.costPrice ? `¥${order.costPrice.toLocaleString()}` : '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300 text-center">{order.sellingPrice ? `¥${order.sellingPrice.toLocaleString()}` : '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300 max-w-[100px] truncate">{order.threadColor || '-'}</td>
                                    <td className="px-3 py-2 border border-slate-300 text-center">
                                        <OrderStatusSelect
                                            itemId={order.id}
                                            currentStatus={order.status}
                                            updateAction={handleStatusUpdate}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {orders.length === 0 && (
                    <div className="p-8 text-center text-slate-500 font-bold">
                        データがありません
                    </div>
                )}
            </div>
        </div>
    )
}
