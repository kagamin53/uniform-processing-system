import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ReportPage({ searchParams }: PageProps) {
    const params = await searchParams

    // 現在の年月 (デフォルト)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const defaultMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`

    // クエリパラメータから年月を取得
    const selectedMonth = typeof params?.month === 'string' ? params.month : defaultMonth
    const [yearStr, monthStr] = selectedMonth.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)

    // 月初と月末を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // 前月と翌月のリンク用
    const prevDate = new Date(year, month - 2, 1)
    const nextDate = new Date(year, month, 1)
    const prevMonthStr = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`
    const nextMonthStr = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`

    // データの取得 (完了済みのみ)
    const items = await prisma.planningEntry.findMany({
        where: {
            planDate: {
                gte: startDate,
                lte: endDate
            },
            status: 'completed'
        },
        orderBy: [
            { planDate: 'asc' },
            { id: 'asc' }
        ]
    })

    // 集計
    const totalCount = items.length
    const totalCost = items.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.totalQuantity || 0)), 0)
    const totalSales = items.reduce((sum, item) => sum + ((item.sellingPrice || 0) * (item.totalQuantity || 0)), 0)
    const totalQuantity = items.reduce((sum, item) => sum + (item.totalQuantity || 0), 0)

    // 平均受注数 (ゼロ除算回避)
    const avgOrderQty = totalCount > 0 ? (totalQuantity / totalCount).toFixed(1) : '0'

    return (
        <div className="min-h-screen bg-white text-black p-8 font-serif">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    .no-print { display: none !important; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .print-container { width: 100%; max-width: none; }
                }
                .report-table th, .report-table td {
                    border: 1px solid #000;
                    padding: 4px 6px;
                    font-size: 11px;
                }
                .report-table th {
                    background-color: #f0f0f0;
                    text-align: center;
                }
                .summary-table th, .summary-table td {
                    border: 1px solid #000;
                    padding: 8px 16px;
                    font-size: 14px;
                    text-align: center;
                }
                .seal-box {
                    border: 1px solid #000;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .seal-header {
                    border: 1px solid #000;
                    border-bottom: none;
                    text-align: center;
                    font-size: 12px;
                    background-color: #f0f0f0;
                }
            `}</style>

            <div className="print-container max-w-[1200px] mx-auto">
                {/* ナビゲーション (印刷時は非表示) */}
                <div className="no-print flex justify-between items-center mb-8 bg-gray-100 p-4 rounded-lg border border-gray-300">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
                            ダッシュボードへ戻る
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">月次加工計算書プレビュー</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href={`/reports?month=${prevMonthStr}`} className="p-2 hover:bg-gray-200 rounded-full">
                            <span className="material-icons">chevron_left</span>
                        </Link>
                        <span className="text-lg font-bold font-mono">{year}年 {month}月</span>
                        <Link href={`/reports?month=${nextMonthStr}`} className="p-2 hover:bg-gray-200 rounded-full">
                            <span className="material-icons">chevron_right</span>
                        </Link>
                    </div>

                    <PrintButton />
                </div>

                {/* ヘッダー集計・印鑑欄 */}
                <div className="flex justify-between items-start mb-6">
                    {/* 集計表 */}
                    <div className="mt-4">
                        <table className="summary-table border-collapse">
                            <thead>
                                <tr>
                                    <th className="w-24">件数</th>
                                    <th className="w-32">原価合計</th>
                                    <th className="w-32">売上合計</th>
                                    <th className="w-24">枚数合計</th>
                                    <th className="w-24">平均受注数</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{totalCount}</td>
                                    <td>¥{totalCost.toLocaleString()}</td>
                                    <td>¥{totalSales.toLocaleString()}</td>
                                    <td>{totalQuantity.toLocaleString()}</td>
                                    <td>{avgOrderQty}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 印鑑欄 */}
                    <div className="flex border border-black">
                        <div>
                            <div className="seal-header">社長</div>
                            <div className="seal-box"></div>
                        </div>
                        <div>
                            <div className="seal-header">専務</div>
                            <div className="seal-box"></div>
                        </div>
                        <div>
                            <div className="seal-header">部長</div>
                            <div className="seal-box"></div>
                        </div>
                        <div>
                            <div className="seal-header">係長</div>
                            <div className="seal-box"></div>
                        </div>
                        <div>
                            <div className="seal-header">担当</div>
                            <div className="seal-box"></div>
                        </div>
                    </div>
                </div>

                {/* タイトル */}
                <div className="text-center mb-2 relative">
                    <h2 className="text-xl font-bold underline decoration-1 underline-offset-4">
                        刺繍計算書 {month}月分
                    </h2>
                    <div className="absolute right-0 bottom-0 text-sm">
                        {endDate.toLocaleDateString('ja-JP')}
                    </div>
                </div>

                {/* 明細テーブル */}
                <table className="report-table w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="w-12">加工日</th>
                            <th className="w-20">刺繍CD</th>
                            <th className="w-24">市・郡</th>
                            <th className="w-32">園名</th>
                            <th className="w-20">刺繍位置</th>
                            <th className="">商品名</th>
                            <th className="w-16">色名</th>
                            <th className="w-12">枚数</th>
                            <th className="w-12">実費</th>
                            <th className="w-12">売値</th>
                            <th className="w-12">原価比</th>
                            <th className="w-16">金額</th>
                            <th className="w-16">売上金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="text-center py-8 text-gray-500">
                                    データがありません
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const cost = item.costPrice || 0
                                const price = item.sellingPrice || 0
                                const qty = item.totalQuantity || 0
                                const costTotal = cost * qty
                                const salesTotal = price * qty
                                // 原価完算比 (売値 / 実費) ? 画像では "完価採算比" とあるが、売値/実費の値に近い
                                const ratio = cost > 0 ? (price / cost).toFixed(1) : '-'
                                const dateStr = item.planDate ? new Date(item.planDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : ''

                                return (
                                    <tr key={item.id}>
                                        <td className="text-center">{dateStr}</td>
                                        <td>{item.processingCode}</td>
                                        <td>{item.city}</td>
                                        <td>{item.gardenName}</td>
                                        <td>{item.position}</td>
                                        <td className="truncate max-w-[200px]">{item.productName}</td>
                                        <td>{item.colorName}</td>
                                        <td className="text-right">{qty}</td>
                                        <td className="text-right">¥{cost}</td>
                                        <td className="text-right">¥{price}</td>
                                        <td className="text-right">{ratio}</td>
                                        <td className="text-right">¥{costTotal.toLocaleString()}</td>
                                        <td className="text-right">¥{salesTotal.toLocaleString()}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
