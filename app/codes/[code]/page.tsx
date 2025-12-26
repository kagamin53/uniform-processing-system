import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CodeDetailPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params

    const processingCode = await prisma.processingCode.findUnique({
        where: { code },
        include: {
            pickingItems: {
                take: 20,
                orderBy: { shippingDate: 'desc' }
            }
        }
    })

    if (!processingCode) return notFound()

    const itemCount = await prisma.pickingItem.count({
        where: { processingCodeId: processingCode.id }
    })

    return (
        <div className="max-w-5xl mx-auto px-4">
            {/* ヘッダー */}
            <div className="flex items-center gap-4 mb-4 bg-white border border-slate-300 rounded p-4">
                <Link href="/codes" className="text-blue-600 hover:underline font-bold">← 戻る</Link>
                <h2 className="text-xl font-black text-slate-800 font-mono">{processingCode.code}</h2>
            </div>

            {/* 加工コード情報 */}
            <div className="bg-white border border-slate-300 rounded p-6 mb-4">
                <h3 className="font-black text-lg text-slate-800 mb-4 border-b-2 border-slate-200 pb-2">加工コード情報</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">得意先名</p>
                        <p className="font-bold text-slate-800">{processingCode.customerName || '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">市・郡</p>
                        <p className="text-slate-700">{processingCode.city || '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">商品名</p>
                        <p className="text-slate-700">{processingCode.productName || '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">刺繍位置</p>
                        <p className="font-bold text-blue-700">{processingCode.position || '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">使用糸</p>
                        <p className="font-bold text-orange-600">{processingCode.threadColor || '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">工程時期</p>
                        <p className="text-slate-700">{processingCode.processTime || '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">実費</p>
                        <p className="text-slate-700">{processingCode.costPrice ? `¥${processingCode.costPrice.toLocaleString()}` : '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                        <p className="text-slate-500 text-xs font-bold">売値</p>
                        <p className="font-bold text-green-700">{processingCode.sellingPrice ? `¥${processingCode.sellingPrice.toLocaleString()}` : '-'}</p>
                    </div>
                    <div className="border border-slate-200 rounded p-3 bg-yellow-50">
                        <p className="text-slate-500 text-xs font-bold">使用回数</p>
                        <p className="font-black text-yellow-700 text-lg">{itemCount} 件</p>
                    </div>
                </div>
                {processingCode.notes && (
                    <div className="mt-4 p-4 bg-slate-100 border border-slate-200 rounded">
                        <p className="text-slate-500 text-xs font-bold">備考</p>
                        <p className="text-slate-700">{processingCode.notes}</p>
                    </div>
                )}

                {/* バルダン・タジマ時間 */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="border-2 border-blue-300 bg-blue-50 rounded p-4">
                        <p className="text-blue-600 text-xs font-bold">バルダン加工時間</p>
                        <p className="font-black text-blue-700 text-lg">{processingCode.baldanTime || '-'}</p>
                    </div>
                    <div className="border-2 border-green-300 bg-green-50 rounded p-4">
                        <p className="text-green-600 text-xs font-bold">タジマ加工時間</p>
                        <p className="font-black text-green-700 text-lg">{processingCode.tajimaTime || '-'}</p>
                    </div>
                </div>
            </div>

            {/* 関連ピッキング */}
            <div className="bg-white border border-slate-300 rounded p-6">
                <h3 className="font-black text-lg text-slate-800 mb-4 border-b-2 border-slate-200 pb-2">関連ピッキング（最新20件）</h3>
                {processingCode.pickingItems.length === 0 ? (
                    <p className="text-slate-500">このコードを使用したピッキングはありません</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-700 text-white">
                                <tr>
                                    <th className="text-left p-3 font-bold">出荷予定</th>
                                    <th className="text-left p-3 font-bold">得意先</th>
                                    <th className="text-left p-3 font-bold">商品</th>
                                    <th className="text-left p-3 font-bold">サイズ</th>
                                    <th className="text-right p-3 font-bold">数量</th>
                                    <th className="text-left p-3 font-bold">ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processingCode.pickingItems.map((item, index) => (
                                    <tr key={item.id} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                        <td className="p-3 text-slate-700">
                                            {item.shippingDate ? new Date(item.shippingDate).toLocaleDateString('ja-JP') : '-'}
                                        </td>
                                        <td className="p-3 text-slate-800 font-medium">{item.customerName || '-'}</td>
                                        <td className="p-3 text-slate-700">{item.productName || '-'}</td>
                                        <td className="p-3 text-slate-700">{item.size || '-'}</td>
                                        <td className="p-3 text-right text-slate-700">{item.orderQuantity || '-'}</td>
                                        <td className="p-3">
                                            <span className={`px-3 py-1 rounded text-xs font-bold ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                                    item.status === 'processing' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                                                        'bg-green-100 text-green-700 border border-green-300'
                                                }`}>
                                                {item.status === 'pending' ? '未処理' :
                                                    item.status === 'processing' ? '加工中' : '完了'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-4">
                    <Link href={`/picking?code=${processingCode.code}`} className="text-blue-600 hover:underline font-bold">
                        このコードのピッキングをすべて表示 →
                    </Link>
                </div>
            </div>
        </div>
    )
}
